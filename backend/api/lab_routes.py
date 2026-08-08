from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from typing import List, Optional
import sys
import os
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import (
    save_lab_result, get_lab_results, update_lab_result, delete_lab_result,
    save_treatment, get_treatments, update_treatment, delete_treatment,
    compute_milestones, delete_all_lab_data,
    save_checkup_record, get_checkup_records, update_checkup_record, delete_checkup_record,
    get_setting, save_setting,
    save_checkup_reminder, get_checkup_reminders, update_checkup_reminder, delete_checkup_reminder
)
from api.upload_parser import parse_csv, parse_pdf, parse_image
from lab_warnings import check_trends
from datetime import datetime
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["lab-results"])


class LabResultCreate(BaseModel):
    test_type: Optional[str] = None
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    test_date: Optional[str] = None
    notes: Optional[str] = None


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
    return {"message": "Lab result updated"}


@router.delete("/lab-results/{result_id}")
async def delete_lab_result_endpoint(result_id: int, user_id: str = Depends(get_current_user)):
    # Verify result belongs to user
    user_results = get_lab_results(user_id=user_id)
    result_ids = [r["id"] for r in user_results]
    if result_id not in result_ids:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    delete_lab_result(result_id)
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
async def upload_csv(file: UploadFile = File(...), _user_id: str = Depends(get_current_user)):
    content = await file.read()
    text = content.decode("utf-8")
    return parse_csv(text)


@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), _user_id: str = Depends(get_current_user)):
    content = await file.read()
    return parse_pdf(content)


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), _user_id: str = Depends(get_current_user)):
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

    milestones = compute_milestones(user_id=user_id)

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


@router.get("/dashboard/full")
async def get_dashboard_full(user_id: str = Depends(get_current_user)):
    """Aggregate all dashboard data in a single response."""
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            "lab_results": executor.submit(get_lab_results, None, user_id),
            "treatments": executor.submit(get_treatments, user_id),
            "checkup_records": executor.submit(get_checkup_records, user_id),
            "next_checkup_reminders": executor.submit(get_checkup_reminders, user_id),
        }
        lab_results = futures["lab_results"].result()
        treatments = futures["treatments"].result()
        checkup_records = futures["checkup_records"].result()
        next_checkup_reminders = futures["next_checkup_reminders"].result()

    # Milestones
    milestones = compute_milestones(user_id=user_id)

    # Latest values
    latest = {}
    for test_type in ("bcr_abl1", "cbc_wbc", "cbc_platelets", "cbc_hemoglobin", "cbc_rbc"):
        type_results = [r for r in lab_results if r["test_type"] == test_type]
        if type_results:
            latest[test_type] = max(type_results, key=lambda x: x["test_date"])

    # Current treatment
    current_treatment = None
    for t in treatments:
        if t["end_date"] is None:
            current_treatment = t

    # Warnings
    warnings = check_trends(lab_results, treatments)

    # Lab results grouped by test type
    lab_by_type = {}
    for test_type in ("bcr_abl1", "cbc_platelets", "cbc_hemoglobin", "cbc_wbc", "cbc_rbc"):
        lab_by_type[test_type] = [
            {"value": r["value"], "test_date": r["test_date"]}
            for r in lab_results if r["test_type"] == test_type
        ]
    lab_by_type["all"] = [
        {"id": r["id"], "test_type": r["test_type"], "value": r["value"],
         "unit": r["unit"], "test_date": r["test_date"], "reference_range": r.get("reference_range"),
         "notes": r.get("notes")}
        for r in lab_results
    ]

    # Next checkup from reminders table
    next_checkup = {"date": None, "bring_items": None}
    if next_checkup_reminders:
        latest_reminder = next_checkup_reminders[0]
        next_checkup = {
            "date": latest_reminder["reminder_date"],
            "bring_items": latest_reminder["bring_items"],
        }

    return {
        "latest_values": latest,
        "current_treatment": current_treatment,
        "warnings": warnings,
        "milestones": milestones,
        "total_results": len(lab_results),
        "lab_results": lab_by_type,
        "treatments": treatments,
        "checkup_records": checkup_records,
        "next_checkup": next_checkup,
    }


@router.get("/milestones", response_model=List[dict])
async def list_milestones(user_id: str = Depends(get_current_user)):
    return compute_milestones(user_id=user_id)


@router.get("/debug/milestones")
async def debug_milestones(user_id: str = Depends(get_current_user)):
    """Debug: show computed milestones and BCR-ABL1 results for current user."""
    milestones = compute_milestones(user_id=user_id)
    lab_results = get_lab_results(test_type="bcr_abl1", user_id=user_id)
    return {
        "milestones": milestones,
        "bcr_abl1_results": [{"id": r["id"], "type": r["test_type"], "value": r["value"], "date": r["test_date"]} for r in lab_results],
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


class SettingsSave(BaseModel):
    key: str
    value: str


class ApiKeyValidate(BaseModel):
    value: str


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
async def update_checkup(record_id: int, data: CheckupRecordUpdate, user_id: str = Depends(get_current_user)):
    user_records = get_checkup_records(user_id=user_id)
    record_ids = [r["id"] for r in user_records]
    if record_id not in record_ids:
        raise HTTPException(status_code=404, detail="Record not found")
    update_checkup_record(
        record_id=record_id,
        checkup_date=data.checkup_date,
        doctor_advice=data.doctor_advice,
        medications_bought=data.medications_bought,
        medication_cost=data.medication_cost,
    )
    return {"message": "Updated"}


@router.delete("/checkup-records/{record_id}")
async def delete_checkup(record_id: int, user_id: str = Depends(get_current_user)):
    user_records = get_checkup_records(user_id=user_id)
    record_ids = [r["id"] for r in user_records]
    if record_id not in record_ids:
        raise HTTPException(status_code=404, detail="Record not found")
    delete_checkup_record(record_id)
    return {"message": "Deleted"}


# ==========================================
# CHECKUP REMINDERS
# ==========================================

class CheckupReminderCreate(BaseModel):
    reminder_date: str
    bring_items: str = ''

class CheckupReminderUpdate(BaseModel):
    reminder_date: str
    bring_items: str = ''

class CheckupReminderResponse(BaseModel):
    id: int
    reminder_date: str
    bring_items: str | None
    created_at: str


@router.get("/checkup-reminders", response_model=list[CheckupReminderResponse])
async def list_checkup_reminders(user_id: str = Depends(get_current_user)):
    reminders = get_checkup_reminders(user_id=user_id)
    return [CheckupReminderResponse(**r) for r in reminders]


@router.post("/checkup-reminders", response_model=CheckupReminderResponse)
async def create_checkup_reminder(reminder: CheckupReminderCreate, user_id: str = Depends(get_current_user)):
    row_id = save_checkup_reminder(reminder.reminder_date, reminder.bring_items, user_id=user_id)
    return CheckupReminderResponse(
        id=row_id,
        reminder_date=reminder.reminder_date,
        bring_items=reminder.bring_items,
        created_at=""
    )


@router.put("/checkup-reminders/{reminder_id}")
async def update_checkup_reminder_endpoint(reminder_id: int, reminder: CheckupReminderUpdate, user_id: str = Depends(get_current_user)):
    reminders = get_checkup_reminders(user_id=user_id)
    reminder_ids = [r["id"] for r in reminders]
    if reminder_id not in reminder_ids:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated = update_checkup_reminder(reminder_id, reminder.reminder_date, reminder.bring_items)
    if not updated:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder updated"}


@router.delete("/checkup-reminders/{reminder_id}")
async def delete_checkup_reminder_endpoint(reminder_id: int, user_id: str = Depends(get_current_user)):
    reminders = get_checkup_reminders(user_id=user_id)
    reminder_ids = [r["id"] for r in reminders]
    if reminder_id not in reminder_ids:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    deleted = delete_checkup_reminder(reminder_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder deleted"}


# ==========================================
# USER SETTINGS
# ==========================================

def _mask_key(key: str) -> str:
    """Mask an API key: show first 6 and last 4 characters."""
    if len(key) <= 10:
        return key[:3] + "..." + key[-3:]
    return key[:6] + "..." + key[-4:]


@router.get("/settings/has-key")
async def has_api_key(user_id: str = Depends(get_current_user)):
    """Check if user has a Gemini API key configured."""
    value = get_setting("gemini_api_key", user_id=user_id)
    return {"has_key": bool(value)}


@router.get("/settings/{key}")
async def get_user_setting(key: str, user_id: str = Depends(get_current_user)):
    value = get_setting(key, user_id=user_id)
    if key == "gemini_api_key" and value:
        return {"key": key, "value": _mask_key(value), "has_key": True}
    return {"key": key, "value": value}


@router.post("/settings")
async def save_user_setting(data: SettingsSave, user_id: str = Depends(get_current_user)):
    value = data.value
    if data.key == "gemini_api_key":
        from encryption import encrypt_value
        value = encrypt_value(value)
    save_setting(data.key, value, user_id=user_id)
    return {"message": "Saved"}


@router.delete("/settings/{key}")
async def delete_user_setting(key: str, user_id: str = Depends(get_current_user)):
    from database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_settings WHERE key = %s AND user_id = %s", (key, user_id))
    conn.commit()
    conn.close()
    return {"message": "Deleted"}


@router.post("/settings/validate-key")
async def validate_api_key(data: ApiKeyValidate):
    """Validate a Gemini API key by making a minimal test call."""
    try:
        from google import genai
        client = genai.Client(api_key=data.value)
        client.models.generate_content(
            model="gemma-4-31b-it",
            contents="hi"
        )
        return {"valid": True}
    except Exception as e:
        return {"valid": False, "error": str(e)}


@router.delete("/reset")
async def reset_dashboard(user_id: str = Depends(get_current_user)):
    """Delete all lab results, treatments, milestones, settings, checkup records, and sessions for current user."""
    delete_all_lab_data(user_id=user_id)
    return {"message": "All data deleted"}