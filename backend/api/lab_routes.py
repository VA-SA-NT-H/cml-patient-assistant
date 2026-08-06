from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from typing import List, Optional
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import (
    save_lab_result, get_lab_results, update_lab_result, delete_lab_result,
    save_treatment, get_treatments, update_treatment, delete_treatment,
    get_milestones, delete_all_lab_data,
    save_checkup_record, get_checkup_records, update_checkup_record, delete_checkup_record,
    get_setting, save_setting
)
from api.upload_parser import parse_csv, parse_pdf, parse_image
from lab_warnings import check_trends
from datetime import datetime
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["lab-results"])


class LabResultCreate(BaseModel):
    test_type: str
    value: str
    unit: str
    reference_range: Optional[str] = None
    test_date: str
    notes: Optional[str] = None


def recalculate_milestones(user_id: str = None):
    """Recalculate all milestones from all existing BCR-ABL1 results."""
    import sqlite3
    from database import DB_NAME

    milestones = [
        ("ccyr", 1.0),
        ("mmr", 0.1),
        ("mr4", 0.01),
        ("mr4_5", 0.0032),
    ]

    try:
        results = get_lab_results(test_type="bcr_abl1", user_id=user_id)
        print(f"[milestones] Found {len(results)} decrypted BCR-ABL1 results")

        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        # Find the latest BCR-ABL1 result (most recent test_date)
        latest_result = None
        for r in results:
            try:
                if latest_result is None or r["test_date"] > latest_result["test_date"]:
                    latest_result = r
            except Exception:
                continue

        if latest_result:
            print(f"[milestones] Latest result: {latest_result['value']} on {latest_result['test_date']}")
        else:
            print("[milestones] No BCR-ABL1 results found")

        for milestone_type, threshold in milestones:
            achieved = False
            achieved_date = None
            achieved_value = None

            if latest_result:
                try:
                    cleaned = latest_result["value"].replace('%', '').replace(' ', '').strip()
                    val = float(cleaned)
                    print(f"[milestones] {milestone_type}: checking {cleaned} <= {threshold} -> {val <= threshold}")
                    if val <= threshold:
                        achieved = True
                        achieved_date = latest_result["test_date"]
                        achieved_value = latest_result["value"]
                except ValueError as e:
                    print(f"[milestones] Failed to parse '{latest_result['value']}': {e}")

            cursor.execute(
                "SELECT id FROM milestones WHERE milestone_type = ? AND user_id = ?",
                (milestone_type, user_id)
            )
            existing = cursor.fetchone()

            if existing:
                cursor.execute(
                    "UPDATE milestones SET achieved = ?, achieved_date = ?, value_at_achievement = ? WHERE milestone_type = ? AND user_id = ?",
                    (1 if achieved else 0, achieved_date, achieved_value, milestone_type, user_id)
                )
                print(f"[milestones] Updated {milestone_type}: achieved={achieved}")
            else:
                cursor.execute(
                    "INSERT INTO milestones (milestone_type, achieved, achieved_date, value_at_achievement, user_id) VALUES (?, ?, ?, ?, ?)",
                    (milestone_type, 1 if achieved else 0, achieved_date, achieved_value, user_id)
                )
                print(f"[milestones] Inserted {milestone_type}: achieved={achieved}")

        conn.commit()
        conn.close()
        print("[milestones] Done")
    except Exception as e:
        print(f"[milestones] ERROR: {e}")


class LabResultUpdate(BaseModel):
    test_type: Optional[str] = None
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    test_date: Optional[str] = None
    notes: Optional[str] = None


class LabResultResponse(BaseModel):
    id: int
    test_type: str
    value: str
    unit: str
    reference_range: Optional[str]
    test_date: str
    notes: Optional[str]
    created_at: str


@router.get("/lab-results", response_model=List[LabResultResponse])
async def list_lab_results(test_type: Optional[str] = None, user_id: str = Depends(get_current_user)):
    results = get_lab_results(test_type, user_id=user_id)
    return [LabResultResponse(**r) for r in results]


@router.post("/lab-results", response_model=LabResultResponse)
async def create_lab_result(result: LabResultCreate, user_id: str = Depends(get_current_user)):
    row_id = save_lab_result(
        test_type=result.test_type,
        value=result.value,
        unit=result.unit,
        test_date=result.test_date,
        reference_range=result.reference_range,
        notes=result.notes,
        user_id=user_id,
    )
    # Recalculate milestones after saving BCR-ABL1
    if result.test_type == "bcr_abl1":
        recalculate_milestones(user_id=user_id)
    return LabResultResponse(
        id=row_id, test_type=result.test_type, value=result.value,
        unit=result.unit, reference_range=result.reference_range,
        test_date=result.test_date, notes=result.notes, created_at=""
    )


@router.put("/lab-results/{result_id}")
async def update_lab_result_endpoint(result_id: int, result: LabResultUpdate, user_id: str = Depends(get_current_user)):
    # Verify result belongs to user
    user_results = get_lab_results(user_id=user_id)
    result_ids = [r["id"] for r in user_results]
    if result_id not in result_ids:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_lab_result(result_id, **result.model_dump(exclude_unset=True))
    # Recalculate milestones if this was a BCR-ABL1 result
    if result.test_type == "bcr_abl1" or result.value is not None:
        recalculate_milestones(user_id=user_id)
    return {"message": "Lab result updated"}


@router.delete("/lab-results/{result_id}")
async def delete_lab_result_endpoint(result_id: int, user_id: str = Depends(get_current_user)):
    # Verify result belongs to user
    user_results = get_lab_results(user_id=user_id)
    result_ids = [r["id"] for r in user_results]
    if result_id not in result_ids:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    delete_lab_result(result_id)
    recalculate_milestones(user_id=user_id)
    return {"message": "Lab result deleted"}

class TreatmentCreate(BaseModel):
    drug_name: str
    dosage_mg: int
    start_date: str
    end_date: Optional[str] = None
    reason_for_change: Optional[str] = None


class TreatmentUpdate(BaseModel):
    drug_name: Optional[str] = None
    dosage_mg: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    reason_for_change: Optional[str] = None


class TreatmentResponse(BaseModel):
    id: int
    drug_name: str
    dosage_mg: int
    start_date: str
    end_date: Optional[str]
    reason_for_change: Optional[str]


@router.get("/treatments", response_model=List[TreatmentResponse])
async def list_treatments(user_id: str = Depends(get_current_user)):
    treatments = get_treatments(user_id=user_id)
    return [TreatmentResponse(**t) for t in treatments]


@router.post("/treatments", response_model=TreatmentResponse)
async def create_treatment(treatment: TreatmentCreate, user_id: str = Depends(get_current_user)):
    row_id = save_treatment(
        drug_name=treatment.drug_name,
        dosage_mg=treatment.dosage_mg,
        start_date=treatment.start_date,
        end_date=treatment.end_date,
        reason_for_change=treatment.reason_for_change,
        user_id=user_id,
    )
    return TreatmentResponse(
        id=row_id, drug_name=treatment.drug_name,
        dosage_mg=treatment.dosage_mg, start_date=treatment.start_date,
        end_date=treatment.end_date, reason_for_change=treatment.reason_for_change
    )


@router.put("/treatments/{treatment_id}")
async def update_treatment_endpoint(treatment_id: int, treatment: TreatmentUpdate, user_id: str = Depends(get_current_user)):
    # Verify treatment belongs to user
    user_treatments = get_treatments(user_id=user_id)
    treatment_ids = [t["id"] for t in user_treatments]
    if treatment_id not in treatment_ids:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_treatment(treatment_id, **treatment.model_dump(exclude_unset=True))
    return {"message": "Treatment updated"}


@router.delete("/treatments/{treatment_id}")
async def delete_treatment_endpoint(treatment_id: int, user_id: str = Depends(get_current_user)):
    # Verify treatment belongs to user
    user_treatments = get_treatments(user_id=user_id)
    treatment_ids = [t["id"] for t in user_treatments]
    if treatment_id not in treatment_ids:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    delete_treatment(treatment_id)
    return {"message": "Treatment deleted"}

class BulkLabResult(BaseModel):
    test_type: str
    value: str
    unit: str
    test_date: str
    notes: Optional[str] = None


class BulkCreate(BaseModel):
    results: List[BulkLabResult]


@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8")
    return parse_csv(text)


@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    content = await file.read()
    return parse_pdf(content)


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    content = await file.read()
    return parse_image(content)


@router.post("/lab-results/bulk")
async def bulk_create_lab_results(data: BulkCreate, user_id: str = Depends(get_current_user)):
    created = 0
    for r in data.results:
        save_lab_result(
            test_type=r.test_type, value=r.value, unit=r.unit,
            test_date=r.test_date, notes=r.notes, user_id=user_id,
        )
        created += 1
    return {"created": created}

@router.get("/dashboard")
async def get_dashboard(user_id: str = Depends(get_current_user)):
    lab_results = get_lab_results(user_id=user_id)
    treatments = get_treatments(user_id=user_id)

    # Recalculate milestones on every dashboard load
    recalculate_milestones(user_id=user_id)
    milestones = get_milestones(user_id=user_id)

    # Latest values
    latest = {}
    for test_type in ("bcr_abl1", "cbc_wbc", "cbc_platelets", "cbc_hemoglobin"):
        type_results = [r for r in lab_results if r["test_type"] == test_type]
        if type_results:
            latest[test_type] = max(type_results, key=lambda x: x["test_date"])

    # Current treatment (no end_date)
    current_treatment = None
    for t in treatments:
        if t["end_date"] is None:
            current_treatment = t

    # Compute warnings
    warnings = check_trends(lab_results, treatments)

    return {
        "latest_values": latest,
        "current_treatment": current_treatment,
        "warnings": warnings,
        "milestones": milestones,
        "total_results": len(lab_results),
    }


@router.get("/milestones", response_model=List[dict])
async def list_milestones(user_id: str = Depends(get_current_user)):
    return get_milestones(user_id=user_id)


@router.get("/debug/milestones")
async def debug_milestones():
    """Debug: show raw milestone data and BCR-ABL1 results."""
    import sqlite3
    from database import DB_NAME
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT id, milestone_type, achieved, achieved_date, value_at_achievement FROM milestones")
    milestones = cursor.fetchall()
    cursor.execute("SELECT id, test_type, value, test_date FROM lab_results WHERE test_type = 'bcr_abl1'")
    bcr_results = cursor.fetchall()
    conn.close()
    return {
        "milestones": [{"id": r[0], "type": r[1], "achieved": r[2], "date": r[3], "value": r[4]} for r in milestones],
        "bcr_abl1_results": [{"id": r[0], "type": r[1], "value": r[2], "date": r[3]} for r in bcr_results],
    }


# ==========================================
# CHECKUP RECORDS
# ==========================================

class CheckupRecordCreate(BaseModel):
    checkup_date: str
    doctor_advice: Optional[str] = None
    medications_bought: Optional[str] = None
    medication_cost: Optional[str] = None


class CheckupRecordUpdate(BaseModel):
    checkup_date: Optional[str] = None
    doctor_advice: Optional[str] = None
    medications_bought: Optional[str] = None
    medication_cost: Optional[str] = None


class CheckupRecordResponse(BaseModel):
    id: int
    checkup_date: str
    doctor_advice: Optional[str]
    medications_bought: Optional[str]
    medication_cost: Optional[str]
    created_at: str


@router.get("/checkup-records", response_model=List[CheckupRecordResponse])
async def list_checkup_records(user_id: str = Depends(get_current_user)):
    return get_checkup_records(user_id=user_id)


@router.post("/checkup-records", response_model=CheckupRecordResponse)
async def create_checkup_record(data: CheckupRecordCreate, user_id: str = Depends(get_current_user)):
    row_id = save_checkup_record(
        checkup_date=data.checkup_date,
        doctor_advice=data.doctor_advice,
        medications_bought=data.medications_bought,
        medication_cost=data.medication_cost,
        user_id=user_id,
    )
    records = get_checkup_records(user_id=user_id)
    return next(r for r in records if r["id"] == row_id)


@router.put("/checkup-records/{record_id}")
async def update_checkup(record_id: int, data: CheckupRecordUpdate):
    update_checkup_record(
        record_id=record_id,
        checkup_date=data.checkup_date,
        doctor_advice=data.doctor_advice,
        medications_bought=data.medications_bought,
        medication_cost=data.medication_cost,
    )
    return {"message": "Updated"}


@router.delete("/checkup-records/{record_id}")
async def delete_checkup(record_id: int):
    delete_checkup_record(record_id)
    return {"message": "Deleted"}


# ==========================================
# USER SETTINGS
# ==========================================

@router.get("/settings/{key}")
async def get_user_setting(key: str, user_id: str = Depends(get_current_user)):
    value = get_setting(key, user_id=user_id)
    return {"key": key, "value": value}


@router.post("/settings")
async def save_user_setting(key: str, value: str, user_id: str = Depends(get_current_user)):
    save_setting(key, value, user_id=user_id)
    return {"message": "Saved"}


@router.delete("/reset")
async def reset_dashboard(user_id: str = Depends(get_current_user)):
    """Delete all lab results, treatments, milestones, settings, checkup records, and sessions for current user."""
    delete_all_lab_data(user_id=user_id)
    return {"message": "All data deleted"}