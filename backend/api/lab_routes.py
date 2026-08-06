from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import (
    save_lab_result, get_lab_results, update_lab_result, delete_lab_result,
    save_treatment, get_treatments, update_treatment, delete_treatment,
    get_milestones, delete_all_lab_data
)
from api.upload_parser import parse_csv, parse_pdf, parse_image
from lab_warnings import check_trends
from datetime import datetime

router = APIRouter(prefix="/api", tags=["lab-results"])


class LabResultCreate(BaseModel):
    test_type: str
    value: str
    unit: str
    reference_range: Optional[str] = None
    test_date: str
    notes: Optional[str] = None


def recalculate_milestones():
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
        results = get_lab_results(test_type="bcr_abl1")
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
                "SELECT id FROM milestones WHERE milestone_type = ?",
                (milestone_type,)
            )
            existing = cursor.fetchone()

            if existing:
                cursor.execute(
                    "UPDATE milestones SET achieved = ?, achieved_date = ?, value_at_achievement = ? WHERE milestone_type = ?",
                    (1 if achieved else 0, achieved_date, achieved_value, milestone_type)
                )
                print(f"[milestones] Updated {milestone_type}: achieved={achieved}")
            else:
                cursor.execute(
                    "INSERT INTO milestones (milestone_type, achieved, achieved_date, value_at_achievement) VALUES (?, ?, ?, ?)",
                    (milestone_type, 1 if achieved else 0, achieved_date, achieved_value)
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
async def list_lab_results(test_type: Optional[str] = None):
    results = get_lab_results(test_type)
    return [LabResultResponse(**r) for r in results]


@router.post("/lab-results", response_model=LabResultResponse)
async def create_lab_result(result: LabResultCreate):
    row_id = save_lab_result(
        test_type=result.test_type,
        value=result.value,
        unit=result.unit,
        test_date=result.test_date,
        reference_range=result.reference_range,
        notes=result.notes,
    )
    # Recalculate milestones after saving BCR-ABL1
    if result.test_type == "bcr_abl1":
        recalculate_milestones()
    return LabResultResponse(
        id=row_id, test_type=result.test_type, value=result.value,
        unit=result.unit, reference_range=result.reference_range,
        test_date=result.test_date, notes=result.notes, created_at=""
    )


@router.put("/lab-results/{result_id}")
async def update_lab_result_endpoint(result_id: int, result: LabResultUpdate):
    update_lab_result(result_id, **result.model_dump(exclude_unset=True))
    # Recalculate milestones if this was a BCR-ABL1 result
    if result.test_type == "bcr_abl1" or result.value is not None:
        recalculate_milestones()
    return {"message": "Lab result updated"}


@router.delete("/lab-results/{result_id}")
async def delete_lab_result_endpoint(result_id: int):
    delete_lab_result(result_id)
    recalculate_milestones()
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
async def list_treatments():
    treatments = get_treatments()
    return [TreatmentResponse(**t) for t in treatments]


@router.post("/treatments", response_model=TreatmentResponse)
async def create_treatment(treatment: TreatmentCreate):
    row_id = save_treatment(
        drug_name=treatment.drug_name,
        dosage_mg=treatment.dosage_mg,
        start_date=treatment.start_date,
        end_date=treatment.end_date,
        reason_for_change=treatment.reason_for_change,
    )
    return TreatmentResponse(
        id=row_id, drug_name=treatment.drug_name,
        dosage_mg=treatment.dosage_mg, start_date=treatment.start_date,
        end_date=treatment.end_date, reason_for_change=treatment.reason_for_change
    )


@router.put("/treatments/{treatment_id}")
async def update_treatment_endpoint(treatment_id: int, treatment: TreatmentUpdate):
    update_treatment(treatment_id, **treatment.model_dump(exclude_unset=True))
    return {"message": "Treatment updated"}


@router.delete("/treatments/{treatment_id}")
async def delete_treatment_endpoint(treatment_id: int):
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
async def bulk_create_lab_results(data: BulkCreate):
    created = 0
    for r in data.results:
        save_lab_result(
            test_type=r.test_type, value=r.value, unit=r.unit,
            test_date=r.test_date, notes=r.notes,
        )
        created += 1
    return {"created": created}

@router.get("/dashboard")
async def get_dashboard():
    lab_results = get_lab_results()
    treatments = get_treatments()

    # Recalculate milestones on every dashboard load
    recalculate_milestones()
    milestones = get_milestones()

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
async def list_milestones():
    return get_milestones()


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


@router.delete("/reset")
async def reset_dashboard():
    """Delete all lab results, treatments, and milestones."""
    delete_all_lab_data()
    return {"message": "All data deleted"}