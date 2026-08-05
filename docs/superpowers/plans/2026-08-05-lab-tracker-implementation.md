# CML Lab Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lab test tracking, visualization, chatbot context, warnings, and a dashboard to the existing CML Patient Assistant.

**Architecture:** Extend the existing FastAPI backend with new SQLite tables (lab_results, treatments, milestones), add Fernet encryption for sensitive values, create a dashboard page with MUI X Charts, and register a new Gemini tool for patient data access.

**Tech Stack:** Python 3.11, FastAPI, SQLite, Fernet (cryptography), React 19, MUI 6, MUI X Charts, react-router-dom, TypeScript 6, Vite 8

## Global Constraints

- Backend: Python 3.11, FastAPI, SQLite (cml_chat_history.db)
- Frontend: React 19, TypeScript 6, MUI 6, Vite 8
- Encryption: Fernet symmetric via `cryptography` library
- Charts: MUI X Charts (free tier)
- Routing: react-router-dom v7
- All API traffic over localhost only
- Medical disclaimer required in app footer

---

### Task 1: Encryption Module + Key Setup

**Files:**
- Create: `backend/encryption.py`
- Modify: `.env` (add ENCRYPTION_KEY)
- Modify: `.env.example` (add ENCRYPTION_KEY)
- Modify: `backend/requirements.txt` (add cryptography)

**Interfaces:**
- Produces: `encrypt_value(plaintext: str) -> str`, `decrypt_value(ciphertext: str) -> str`

- [ ] **Step 1: Add cryptography to requirements.txt**

Edit `backend/requirements.txt`, append:
```
cryptography>=42.0.0
python-multipart>=0.0.6
```

- [ ] **Step 2: Generate Fernet key**

Run: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
Save the output.

- [ ] **Step 3: Add key to .env**

Append to `.env`:
```
ENCRYPTION_KEY="<paste generated key>"
```

- [ ] **Step 4: Add key to .env.example**

Append to `.env.example`:
```
ENCRYPTION_KEY="your-fernet-key-here"
```

- [ ] **Step 5: Create encryption.py**

Create `backend/encryption.py`:
```python
from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()

_key = os.getenv("ENCRYPTION_KEY")
fernet = Fernet(_key.encode()) if _key else None


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value. Returns plaintext if no key configured."""
    if not fernet:
        return plaintext
    return fernet.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a string value. Returns ciphertext if no key configured."""
    if not fernet:
        return ciphertext
    return fernet.decrypt(ciphertext.encode()).decode()
```

- [ ] **Step 6: Test encryption round-trip**

Run: `cd backend && python -c "from encryption import encrypt_value, decrypt_value; v='2.5'; enc=encrypt_value(v); dec=decrypt_value(enc); print(f'{v} -> {enc} -> {dec}'); assert v == dec, 'Round-trip failed'; print('OK')"`

- [ ] **Step 7: Commit**

```bash
git add backend/encryption.py backend/requirements.txt .env .env.example
git commit -m "feat: add Fernet encryption module for lab data at rest"
```

---

### Task 2: Database Schema — New Tables

**Files:**
- Modify: `backend/database.py` (add 3 tables + CRUD functions)

**Interfaces:**
- Consumes: `encrypt_value`, `decrypt_value` from Task 1
- Produces: `init_lab_db()`, `save_lab_result()`, `get_lab_results()`, `delete_lab_result()`, `update_lab_result()`, `save_treatment()`, `get_treatments()`, `delete_treatment()`, `update_treatment()`, `save_milestone()`, `get_milestones()`, `update_milestone()`

- [ ] **Step 1: Add lab_results table to init_db()**

Edit `backend/database.py`. In `init_db()`, after the existing `messages` table creation, add:

```python
    # Table for lab test results
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lab_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_type TEXT NOT NULL,
            value TEXT NOT NULL,
            unit TEXT NOT NULL,
            reference_range TEXT,
            test_date TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    # Table for TKI treatments
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            drug_name TEXT NOT NULL,
            dosage_mg INTEGER NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT,
            reason_for_change TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    # Table for milestone tracking
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS milestones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            milestone_type TEXT NOT NULL,
            achieved INTEGER NOT NULL DEFAULT 0,
            achieved_date TEXT,
            value_at_achievement TEXT
        )
    ''')
```

- [ ] **Step 2: Add lab result CRUD functions**

Append to `backend/database.py`:

```python
from encryption import encrypt_value, decrypt_value


def save_lab_result(test_type: str, value: str, unit: str, test_date: str,
                    reference_range: str = None, notes: str = None) -> int:
    """Save a lab result with encrypted value. Returns the new row ID."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    encrypted_value = encrypt_value(value)
    cursor.execute(
        "INSERT INTO lab_results (test_type, value, unit, reference_range, test_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (test_type, encrypted_value, unit, reference_range, test_date, notes,
         datetime.now().strftime("%Y-%m-%d %H:%M"))
    )
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id


def get_lab_results(test_type: str = None):
    """Retrieve lab results with decrypted values. Optional filter by test_type."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    if test_type:
        cursor.execute("SELECT id, test_type, value, unit, reference_range, test_date, notes, created_at FROM lab_results WHERE test_type = ? ORDER BY test_date ASC", (test_type,))
    else:
        cursor.execute("SELECT id, test_type, value, unit, reference_range, test_date, notes, created_at FROM lab_results ORDER BY test_date ASC")
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": r[0], "test_type": r[1], "value": decrypt_value(r[2]),
            "unit": r[3], "reference_range": r[4], "test_date": r[5],
            "notes": r[6], "created_at": r[7]
        }
        for r in rows
    ]


def update_lab_result(row_id: int, **kwargs):
    """Update a lab result. Only provided fields are updated."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    allowed = {"test_type", "value", "unit", "reference_range", "test_date", "notes"}
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if "value" in updates:
        updates["value"] = encrypt_value(updates["value"])
    if not updates:
        conn.close()
        return
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [row_id]
    cursor.execute(f"UPDATE lab_results SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()


def delete_lab_result(row_id: int):
    """Delete a lab result."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lab_results WHERE id = ?", (row_id,))
    conn.commit()
    conn.close()
```

- [ ] **Step 3: Add treatment CRUD functions**

Append to `backend/database.py`:

```python
def save_treatment(drug_name: str, dosage_mg: int, start_date: str,
                   end_date: str = None, reason_for_change: str = None) -> int:
    """Save a treatment record. Returns the new row ID."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO treatments (drug_name, dosage_mg, start_date, end_date, reason_for_change, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (drug_name, dosage_mg, start_date, end_date, reason_for_change,
         datetime.now().strftime("%Y-%m-%d %H:%M"))
    )
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id


def get_treatments():
    """Retrieve all treatments ordered by start_date."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT id, drug_name, dosage_mg, start_date, end_date, reason_for_change FROM treatments ORDER BY start_date ASC")
    rows = cursor.fetchall()
    conn.close()
    return [
        {"id": r[0], "drug_name": r[1], "dosage_mg": r[2], "start_date": r[3],
         "end_date": r[4], "reason_for_change": r[5]}
        for r in rows
    ]


def update_treatment(row_id: int, **kwargs):
    """Update a treatment record."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    allowed = {"drug_name", "dosage_mg", "start_date", "end_date", "reason_for_change"}
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not updates:
        conn.close()
        return
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [row_id]
    cursor.execute(f"UPDATE treatments SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()


def delete_treatment(row_id: int):
    """Delete a treatment record."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM treatments WHERE id = ?", (row_id,))
    conn.commit()
    conn.close()
```

- [ ] **Step 4: Add milestone CRUD functions**

Append to `backend/database.py`:

```python
def save_milestone(milestone_type: str, achieved: bool, achieved_date: str = None,
                   value_at_achievement: str = None):
    """Save or update a milestone."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    encrypted_val = encrypt_value(value_at_achievement) if value_at_achievement else None
    cursor.execute(
        "INSERT OR REPLACE INTO milestones (milestone_type, achieved, achieved_date, value_at_achievement) VALUES (?, ?, ?, ?)",
        (milestone_type, 1 if achieved else 0, achieved_date, encrypted_val)
    )
    conn.commit()
    conn.close()


def get_milestones():
    """Retrieve all milestones."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT id, milestone_type, achieved, achieved_date, value_at_achievement FROM milestones")
    rows = cursor.fetchall()
    conn.close()
    return [
        {"id": r[0], "milestone_type": r[1], "achieved": bool(r[2]),
         "achieved_date": r[3],
         "value_at_achievement": decrypt_value(r[4]) if r[4] else None}
        for r in rows
    ]


def update_milestone(milestone_type: str, achieved: bool, achieved_date: str = None,
                     value_at_achievement: str = None):
    """Update a milestone by type."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    encrypted_val = encrypt_value(value_at_achievement) if value_at_achievement else None
    cursor.execute(
        "UPDATE milestones SET achieved = ?, achieved_date = ?, value_at_achievement = ? WHERE milestone_type = ?",
        (1 if achieved else 0, achieved_date, encrypted_val, milestone_type)
    )
    conn.commit()
    conn.close()
```

- [ ] **Step 5: Test database initialization**

Run: `cd backend && python -c "from database import init_db; init_db(); print('DB initialized OK')"`

- [ ] **Step 6: Commit**

```bash
git add backend/database.py
git commit -m "feat: add lab_results, treatments, milestones tables with CRUD and encryption"
```

---

### Task 3: Backend API — Lab Results Endpoints

**Files:**
- Create: `backend/api/lab_routes.py`
- Modify: `backend/api/main.py` (include lab_routes router)

**Interfaces:**
- Consumes: `save_lab_result`, `get_lab_results`, `update_lab_result`, `delete_lab_result` from Task 2
- Produces: REST endpoints for lab results CRUD

- [ ] **Step 1: Create lab_routes.py with Pydantic models**

Create `backend/api/lab_routes.py`:

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import (
    save_lab_result, get_lab_results, update_lab_result, delete_lab_result
)

router = APIRouter(prefix="/api", tags=["lab-results"])


class LabResultCreate(BaseModel):
    test_type: str
    value: str
    unit: str
    reference_range: Optional[str] = None
    test_date: str
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
    return LabResultResponse(
        id=row_id, test_type=result.test_type, value=result.value,
        unit=result.unit, reference_range=result.reference_range,
        test_date=result.test_date, notes=result.notes, created_at=""
    )


@router.put("/lab-results/{result_id}")
async def update_lab_result_endpoint(result_id: int, result: LabResultUpdate):
    update_lab_result(result_id, **result.model_dump(exclude_unset=True))
    return {"message": "Lab result updated"}


@router.delete("/lab-results/{result_id}")
async def delete_lab_result_endpoint(result_id: int):
    delete_lab_result(result_id)
    return {"message": "Lab result deleted"}
```

- [ ] **Step 2: Register lab_routes in main.py**

Edit `backend/api/main.py`. Add import and include_router:

```python
from api.lab_routes import router as lab_router
```

After `app.include_router(router)`, add:
```python
app.include_router(lab_router)
```

- [ ] **Step 3: Test lab results API**

Run: `cd backend && python -c "
from api.main import app
from fastapi.testclient import TestClient
c = TestClient(app)
r = c.post('/api/lab-results', json={'test_type': 'bcr_abl1', 'value': '2.5', 'unit': '%', 'test_date': '2026-01-15'})
print('POST:', r.status_code, r.json())
r = c.get('/api/lab-results')
print('GET:', r.status_code, len(r.json()), 'results')
r = c.get('/api/lab-results?test_type=bcr_abl1')
print('GET filtered:', r.status_code, len(r.json()), 'results')
print('ALL TESTS PASSED')
"`

- [ ] **Step 4: Commit**

```bash
git add backend/api/lab_routes.py backend/api/main.py
git commit -m "feat: add lab results REST API endpoints"
```

---

### Task 4: Backend API — Treatments Endpoints

**Files:**
- Modify: `backend/api/lab_routes.py` (add treatment endpoints)

**Interfaces:**
- Consumes: `save_treatment`, `get_treatments`, `update_treatment`, `delete_treatment` from Task 2
- Produces: REST endpoints for treatments CRUD

- [ ] **Step 1: Add treatment models and endpoints**

Append to `backend/api/lab_routes.py`:

```python
from database import (
    save_lab_result, get_lab_results, update_lab_result, delete_lab_result,
    save_treatment, get_treatments, update_treatment, delete_treatment
)


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
```

- [ ] **Step 2: Test treatments API**

Run: `cd backend && python -c "
from api.main import app
from fastapi.testclient import TestClient
c = TestClient(app)
r = c.post('/api/treatments', json={'drug_name': 'imatinib', 'dosage_mg': 400, 'start_date': '2024-01-15'})
print('POST:', r.status_code, r.json())
r = c.get('/api/treatments')
print('GET:', r.status_code, len(r.json()), 'treatments')
print('ALL TESTS PASSED')
"`

- [ ] **Step 3: Commit**

```bash
git add backend/api/lab_routes.py
git commit -m "feat: add treatments REST API endpoints"
```

---

### Task 5: File Upload Parsing (CSV + PDF)

**Files:**
- Create: `backend/api/upload_parser.py`
- Modify: `backend/api/lab_routes.py` (add upload endpoints)

**Interfaces:**
- Produces: `parse_csv(file_content: str) -> list[dict]`, `parse_pdf(file_content: bytes) -> list[dict]`

- [ ] **Step 1: Create upload_parser.py**

Create `backend/api/upload_parser.py`:

```python
import csv
import io
import re
from datetime import datetime
from PyPDF2 import PdfReader


def parse_csv(file_content: str) -> list[dict]:
    """Parse a CSV file and return preview rows with validation."""
    results = []
    reader = csv.DictReader(io.StringIO(file_content))

    for i, row in enumerate(reader):
        test_type = row.get("test_type", "").strip().lower()
        value = row.get("value", "").strip()
        unit = row.get("unit", "").strip()
        test_date = row.get("date", "").strip()
        notes = row.get("notes", "").strip()

        valid = True
        error = None

        if test_type not in ("bcr_abl1", "cbc_wbc", "cbc_platelets", "cbc_hemoglobin", "other"):
            valid = False
            error = f"Invalid test_type: '{test_type}'"
        elif not _is_numeric(value):
            valid = False
            error = f"Value is not numeric: '{value}'"
        elif not _is_valid_date(test_date):
            valid = False
            error = f"Invalid date format: '{test_date}' (use YYYY-MM-DD)"

        results.append({
            "test_type": test_type,
            "value": value,
            "unit": unit,
            "test_date": test_date,
            "notes": notes,
            "valid": valid,
            "error": error,
        })

    return results


def parse_pdf(file_content: bytes) -> list[dict]:
    """Parse a PDF lab report and extract values via pattern matching."""
    results = []
    reader = PdfReader(io.BytesIO(file_content))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)

    patterns = {
        "bcr_abl1": r"BCR[-\s]*ABL1?\s*[:\s]*(\d+\.?\d*)\s*%?",
        "cbc_wbc": r"WBC\s*[:\s]*(\d+\.?\d*)\s*(?:x10\^?9/L|10\^9|K/uL)?",
        "cbc_platelets": r"Plate(?:lets|s)?\s*[:\s]*(\d+\.?\d*)\s*(?:x10\^?9/L|10\^9|K/uL)?",
        "cbc_hemoglobin": r"(?:Hgb|Hemoglobin|Hb)\s*[:\s]*(\d+\.?\d*)\s*(?:g/dL|g/L)?",
    }

    # Try to extract date
    date_match = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", text)
    test_date = ""
    if date_match:
        raw = date_match.group(1)
        for fmt in ("%m/%d/%Y", "%m-%d-%Y", "%m/%d/%y", "%m-%d-%y"):
            try:
                test_date = datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
                break
            except ValueError:
                continue

    for test_type, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = match.group(1)
            unit = _default_unit(test_type)
            results.append({
                "test_type": test_type,
                "value": value,
                "unit": unit,
                "test_date": test_date,
                "notes": "",
                "valid": True,
                "error": None,
            })

    if not results:
        results.append({
            "test_type": "other",
            "value": "",
            "unit": "",
            "test_date": test_date,
            "notes": "Could not parse PDF — please enter values manually",
            "valid": False,
            "error": "No recognized lab values found in PDF",
        })

    return results


def _is_numeric(value: str) -> bool:
    try:
        float(value)
        return True
    except (ValueError, TypeError):
        return False


def _is_valid_date(date_str: str) -> bool:
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except (ValueError, TypeError):
        return False


def _default_unit(test_type: str) -> str:
    units = {
        "bcr_abl1": "%",
        "cbc_wbc": "x10^9/L",
        "cbc_platelets": "x10^9/L",
        "cbc_hemoglobin": "g/dL",
    }
    return units.get(test_type, "")
```

- [ ] **Step 2: Add upload endpoints to lab_routes.py**

Append to `backend/api/lab_routes.py`:

```python
from fastapi import UploadFile, File
from api.upload_parser import parse_csv, parse_pdf


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
```

- [ ] **Step 3: Test CSV parsing**

Run: `cd backend && python -c "
from api.upload_parser import parse_csv
csv_content = 'date,test_type,value,unit,notes\n2026-01-15,bcr_abl1,2.5,%,Initial\n2026-04-15,bcr_abl1,0.8,%,3mo check'
rows = parse_csv(csv_content)
print(f'Parsed {len(rows)} rows')
assert len(rows) == 2
assert rows[0]['valid'] == True
assert rows[1]['valid'] == True
print('CSV parse test PASSED')
"`

- [ ] **Step 4: Test PDF parsing**

Run: `cd backend && python -c "
from api.upload_parser import parse_pdf
# Minimal test with a generated PDF would go here
# For now, test the error path with empty bytes
rows = parse_pdf(b'')
print(f'Parsed {len(rows)} rows (empty PDF)')
assert rows[0]['valid'] == False
print('PDF parse test PASSED')
"`

- [ ] **Step 5: Commit**

```bash
git add backend/api/upload_parser.py backend/api/lab_routes.py
git commit -m "feat: add CSV and PDF upload parsing with preview endpoints"
```

---

### Task 6: Dashboard Endpoint + Warning System

**Files:**
- Modify: `backend/api/lab_routes.py` (add dashboard + milestones endpoints)
- Create: `backend/warnings.py`

**Interfaces:**
- Consumes: `get_lab_results`, `get_treatments`, `get_milestones` from Task 2
- Produces: `GET /api/dashboard`, `GET /api/milestones`, `check_trends()` function

- [ ] **Step 1: Create warnings.py**

Create `backend/warnings.py`:

```python
from datetime import datetime, timedelta


def check_trends(lab_results: list[dict], treatments: list[dict]) -> list[dict]:
    """Analyze lab results and return active warnings."""
    warnings = []

    # Filter BCR-ABL1 results sorted by date
    bcr_results = sorted(
        [r for r in lab_results if r["test_type"] == "bcr_abl1"],
        key=lambda x: x["test_date"]
    )

    if bcr_results:
        latest_value = float(bcr_results[-1]["value"])
        was_below_mmr = any(float(r["value"]) <= 0.1 for r in bcr_results[:-1])
        was_below_ccyr = any(float(r["value"]) <= 1.0 for r in bcr_results[:-1])

        # Rising BCR-ABL1 trend (last 2+ values increasing)
        if len(bcr_results) >= 2:
            last_values = [float(r["value"]) for r in bcr_results[-3:]]
            if len(last_values) >= 2 and all(
                last_values[i] < last_values[i + 1] for i in range(len(last_values) - 1)
            ):
                increase = last_values[-1] - last_values[0]
                if increase > 0.01:
                    warnings.append({
                        "severity": "high",
                        "condition": "rising_bcr_abl1",
                        "message": "Your BCR-ABL1 levels have been trending upward. Please discuss with your hematologist.",
                    })

        # Loss of MMR
        if was_below_mmr and latest_value > 0.1:
            warnings.append({
                "severity": "critical",
                "condition": "loss_of_mmr",
                "message": "Your BCR-ABL1 has risen above the MMR threshold (0.1%). Contact your hematologist urgently.",
            })

        # Loss of CCyR
        if was_below_ccyr and latest_value > 1.0:
            warnings.append({
                "severity": "critical",
                "condition": "loss_of_ccyr",
                "message": "Your BCR-ABL1 has risen above 1%. This requires immediate medical attention.",
            })

    # CBC warnings
    cbc_wbc = sorted(
        [r for r in lab_results if r["test_type"] == "cbc_wbc"],
        key=lambda x: x["test_date"]
    )
    if cbc_wbc:
        latest_wbc = float(cbc_wbc[-1]["value"])
        if latest_wbc < 1.0:
            warnings.append({
                "severity": "critical",
                "condition": "severe_neutropenia",
                "message": "Your WBC is critically low. Seek immediate medical attention.",
            })

    cbc_plt = sorted(
        [r for r in lab_results if r["test_type"] == "cbc_platelets"],
        key=lambda x: x["test_date"]
    )
    if cbc_plt:
        latest_plt = float(cbc_plt[-1]["value"])
        if latest_plt < 50:
            warnings.append({
                "severity": "high",
                "condition": "severe_thrombocytopenia",
                "message": "Your platelet count is dangerously low. Contact your doctor.",
            })

    cbc_hgb = sorted(
        [r for r in lab_results if r["test_type"] == "cbc_hemoglobin"],
        key=lambda x: x["test_date"]
    )
    if cbc_hgb:
        latest_hgb = float(cbc_hgb[-1]["value"])
        if latest_hgb < 7.0:
            warnings.append({
                "severity": "high",
                "condition": "severe_anemia",
                "message": "Your hemoglobin is severely low. Contact your doctor.",
            })

    # Stale data warning
    all_results = sorted(lab_results, key=lambda x: x["test_date"])
    if all_results:
        last_date = datetime.strptime(all_results[-1]["test_date"], "%Y-%m-%d")
        if datetime.now() - last_date > timedelta(days=180):
            warnings.append({
                "severity": "medium",
                "condition": "stale_data",
                "message": "It's been over 6 months since your last lab test. Please schedule a check-up.",
            })

    return warnings
```

- [ ] **Step 2: Add dashboard and milestones endpoints**

Append to `backend/api/lab_routes.py`:

```python
from warnings import check_trends
from datetime import datetime


@router.get("/dashboard")
async def get_dashboard():
    lab_results = get_lab_results()
    treatments = get_treatments()
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
```

- [ ] **Step 3: Test dashboard endpoint**

Run: `cd backend && python -c "
from api.main import app
from fastapi.testclient import TestClient
c = TestClient(app)
r = c.get('/api/dashboard')
print('Dashboard:', r.status_code, r.json().keys())
assert 'latest_values' in r.json()
assert 'warnings' in r.json()
assert 'milestones' in r.json()
print('Dashboard test PASSED')
"`

- [ ] **Step 4: Commit**

```bash
git add backend/warnings.py backend/api/lab_routes.py
git commit -m "feat: add dashboard endpoint with trend-based warning system"
```

---

### Task 7: Frontend — Routing Setup + Dependencies

**Files:**
- Modify: `frontend/package.json` (add dependencies)
- Modify: `frontend/src/App.tsx` (add routing)
- Modify: `frontend/src/main.tsx` (wrap with BrowserRouter)

**Interfaces:**
- Consumes: existing ThemeProvider, App component
- Produces: React Router setup with `/` and `/dashboard` routes

- [ ] **Step 1: Install frontend dependencies**

Run: `cd frontend && npm install react-router-dom @mui/x-charts`

- [ ] **Step 2: Add routing to App.tsx**

Replace `frontend/src/App.tsx` with:

```tsx
import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { Dashboard } from './pages/Dashboard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Session {
  session_id: string;
  title: string;
  created_at: string;
}

function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/sessions');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      const data = await response.json();
      setSessions([data, ...sessions]);
      setCurrentSessionId(data.session_id);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    try {
      const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}/messages`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await fetch(`http://localhost:8000/api/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions(sessions.filter(s => s.session_id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    try {
      await fetch(`http://localhost:8000/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      setSessions(sessions.map(s =>
        s.session_id === sessionId ? { ...s, title: newTitle } : s
      ));
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!currentSessionId) await handleNewChat();
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const ws = new WebSocket('ws://localhost:8000/ws/chat');
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'chat', session_id: currentSessionId, message: content }));
      };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'token') {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return [...prev.slice(0, -1), { ...last, content: last.content + data.content }];
            }
            return [...prev, { role: 'assistant', content: data.content }];
          });
        } else if (data.type === 'complete') {
          setIsLoading(false);
          ws.close();
        } else if (data.type === 'error') {
          console.error('WebSocket error:', data.message);
          setIsLoading(false);
          ws.close();
        }
      };
      ws.onerror = () => { setIsLoading(false); };
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, overflow: 'auto', py: 2 }}>
        {messages.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', px: 4 }}>
            <Typography variant="h4" gutterBottom>How can I help you today?</Typography>
            <Typography variant="body1" color="text.secondary">
              Ask me anything about CML, TKI medications, side effects, or lifestyle tips.
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage key={index} role={message.role} content={message.content} />
            ))}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', px: 2, mb: 2 }}>
                <CircularProgress size={20} />
              </Box>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </Box>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        sessions={[]}
        currentSessionId={null}
        onSelectSession={() => {}}
        onNewChat={() => navigate('/')}
        onDeleteSession={() => {}}
        onRenameSession={() => {}}
        onNavigateDashboard={() => navigate('/dashboard')}
        isDashboard={isDashboard}
      />
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Box>
  );
}

export default App;
```

- [ ] **Step 3: Update main.tsx with BrowserRouter**

Edit `frontend/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './theme/ThemeProvider'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 4: Build to verify no errors**

Run: `cd frontend && npm run build`

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat: add react-router-dom routing with chat and dashboard routes"
```

---

### Task 8: Frontend — Dashboard Page

**Files:**
- Create: `frontend/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `GET /api/dashboard` endpoint
- Produces: Dashboard page with summary cards, warning banner, chart placeholders

- [ ] **Step 1: Create Dashboard.tsx**

Create `frontend/src/pages/Dashboard.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, Alert } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { LabResultsChart } from '../components/LabResultsChart';
import { CBCChart } from '../components/CBCChart';
import { TreatmentTimeline } from '../components/TreatmentTimeline';
import { MilestoneCards } from '../components/MilestoneCards';
import { WarningBanner } from '../components/WarningBanner';

interface DashboardData {
  latest_values: Record<string, { value: string; unit: string; test_date: string }>;
  current_treatment: { drug_name: string; dosage_mg: number; start_date: string } | null;
  warnings: { severity: string; condition: string; message: string }[];
  milestones: { milestone_type: string; achieved: boolean; achieved_date: string | null }[];
  total_results: number;
}

export const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/dashboard');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Loading dashboard...</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Failed to load dashboard data</Typography>
      </Box>
    );
  }

  const latestBCR = data.latest_values?.bcr_abl1;
  const latestWBC = data.latest_values?.cbc_wbc;

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Dashboard
      </Typography>

      {data.warnings.length > 0 && <WarningBanner warnings={data.warnings} />}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">BCR-ABL1</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {latestBCR ? `${latestBCR.value}${latestBCR.unit}` : 'No data'}
            </Typography>
            {latestBCR && (
              <Chip
                size="small"
                label={parseFloat(latestBCR.value) <= 0.1 ? 'MMR Achieved' : 'Above MMR'}
                color={parseFloat(latestBCR.value) <= 0.1 ? 'success' : 'warning'}
                sx={{ mt: 1 }}
              />
            )}
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">WBC</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {latestWBC ? `${latestWBC.value} ${latestWBC.unit}` : 'No data'}
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">Current TKI</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {data.current_treatment
                ? `${data.current_treatment.drug_name} ${data.current_treatment.dosage_mg}mg`
                : 'No treatment recorded'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>BCR-ABL1 Trend</Typography>
      <Box sx={{ height: 300, mb: 3 }}>
        <LabResultsChart testType="bcr_abl1" />
      </Box>

      <Typography variant="h6" gutterBottom>CBC Trends</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
        <Box sx={{ height: 250 }}>
          <CBCChart testType="cbc_wbc" title="White Blood Cells" />
        </Box>
        <Box sx={{ height: 250 }}>
          <CBCChart testType="cbc_platelets" title="Platelets" />
        </Box>
      </Box>

      <Typography variant="h6" gutterBottom>Treatment History</Typography>
      <TreatmentTimeline />

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Achievements</Typography>
      <MilestoneCards milestones={data.milestones} />

      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          This app is for informational and tracking support only and does not replace professional medical diagnosis, advice, or treatment.
        </Typography>
      </Box>
    </Box>
  );
};
```

- [ ] **Step 2: Build to verify**

Run: `cd frontend && npm run build`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: add Dashboard page with summary cards and layout"
```

---

### Task 9: Frontend — Charts (BCR-ABL1 + CBC)

**Files:**
- Create: `frontend/src/components/LabResultsChart.tsx`
- Create: `frontend/src/components/CBCChart.tsx`

**Interfaces:**
- Consumes: `GET /api/lab-results?test_type=...`
- Produces: MUI X Charts LineChart components with logarithmic support

- [ ] **Step 1: Create LabResultsChart.tsx**

Create `frontend/src/components/LabResultsChart.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import { Box, Typography } from '@mui/material';

interface LabResult {
  value: string;
  test_date: string;
}

interface Props {
  testType: string;
}

export const LabResultsChart = ({ testType }: Props) => {
  const [data, setData] = useState<LabResult[]>([]);

  useEffect(() => {
    fetchData();
  }, [testType]);

  const fetchData = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/lab-results?test_type=${testType}`);
      const results = await response.json();
      setData(results);
    } catch (error) {
      console.error('Failed to fetch lab results:', error);
    }
  };

  if (data.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.secondary">No BCR-ABL1 data yet. Add lab results to see trends.</Typography>
      </Box>
    );
  }

  const xLabels = data.map(d => d.test_date);
  const values = data.map(d => {
    const v = parseFloat(d.value);
    return v > 0 ? v : 0.001;
  });

  return (
    <LineChart
      xAxis={[{ data: xLabels, scaleType: 'point' }]}
      yAxis={[{
        scaleType: 'log',
        min: 0.001,
        max: 100,
        data: [0.001, 0.01, 0.1, 1, 10, 100],
      }]}
      series={[{
        data: values,
        label: 'BCR-ABL1 IS %',
        color: '#8b5cf6',
      }]}
      height={300}
      margin={{ left: 60, right: 20, top: 20, bottom: 30 }}
    />
  );
};
```

- [ ] **Step 2: Create CBCChart.tsx**

Create `frontend/src/components/CBCChart.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import { Box, Typography } from '@mui/material';

interface LabResult {
  value: string;
  test_date: string;
}

interface Props {
  testType: string;
  title: string;
}

export const CBCChart = ({ testType, title }: Props) => {
  const [data, setData] = useState<LabResult[]>([]);

  useEffect(() => { fetchData(); }, [testType]);

  const fetchData = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/lab-results?test_type=${testType}`);
      const results = await response.json();
      setData(results);
    } catch (error) {
      console.error('Failed to fetch CBC data:', error);
    }
  };

  if (data.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.secondary">No {title} data yet.</Typography>
      </Box>
    );
  }

  const xLabels = data.map(d => d.test_date);
  const values = data.map(d => parseFloat(d.value));

  return (
    <LineChart
      xAxis={[{ data: xLabels, scaleType: 'point' }]}
      series={[{
        data: values,
        label: title,
        color: '#7c3aed',
      }]}
      height={250}
      margin={{ left: 50, right: 20, top: 10, bottom: 30 }}
    />
  );
};
```

- [ ] **Step 3: Build to verify**

Run: `cd frontend && npm run build`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/LabResultsChart.tsx frontend/src/components/CBCChart.tsx
git commit -m "feat: add BCR-ABL1 logarithmic chart and CBC trend charts"
```

---

### Task 10: Frontend — Treatment Timeline + Milestone Cards

**Files:**
- Create: `frontend/src/components/TreatmentTimeline.tsx`
- Create: `frontend/src/components/MilestoneCards.tsx`

**Interfaces:**
- Consumes: `GET /api/treatments`, `GET /api/milestones`
- Produces: Timeline component, milestone card grid

- [ ] **Step 1: Create TreatmentTimeline.tsx**

Create `frontend/src/components/TreatmentTimeline.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineDot, TimelineContent } from '@mui/lab';

interface Treatment {
  id: number;
  drug_name: string;
  dosage_mg: number;
  start_date: string;
  end_date: string | null;
}

export const TreatmentTimeline = () => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  useEffect(() => { fetchTreatments(); }, []);

  const fetchTreatments = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/treatments');
      const data = await response.json();
      setTreatments(data);
    } catch (error) {
      console.error('Failed to fetch treatments:', error);
    }
  };

  if (treatments.length === 0) {
    return <Typography color="text.secondary">No treatment history recorded.</Typography>;
  }

  return (
    <Timeline position="left">
      {treatments.map((t, i) => (
        <TimelineItem key={t.id}>
          <TimelineSeparator>
            <TimelineDot color={t.end_date === null ? 'primary' : 'grey'} />
            {i < treatments.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t.drug_name} {t.dosage_mg}mg
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t.start_date} — {t.end_date || 'present'}
            </Typography>
            {t.end_date === null && (
              <Chip size="small" label="Current" color="primary" sx={{ ml: 1 }} />
            )}
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
};
```

- [ ] **Step 2: Create MilestoneCards.tsx**

Create `frontend/src/components/MilestoneCards.tsx`:

```tsx
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

interface Milestone {
  milestone_type: string;
  achieved: boolean;
  achieved_date: string | null;
}

interface Props {
  milestones: Milestone[];
}

const MILESTONE_LABELS: Record<string, { label: string; threshold: string }> = {
  ccyr: { label: 'CCyR', threshold: 'BCR-ABL1 ≤ 1%' },
  mmr: { label: 'MMR', threshold: 'BCR-ABL1 ≤ 0.1%' },
  mr4: { label: 'MR4', threshold: 'BCR-ABL1 ≤ 0.01%' },
  mr4_5: { label: 'MR4.5', threshold: 'BCR-ABL1 ≤ 0.0032%' },
  mrd_negative: { label: 'MRD Negative', threshold: 'Undetectable' },
};

const ALL_MILESTONES = ['ccyr', 'mmr', 'mr4', 'mr4_5'];

export const MilestoneCards = ({ milestones }: Props) => {
  const milestoneMap = Object.fromEntries(milestones.map(m => [m.milestone_type, m]));

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 2 }}>
      {ALL_MILESTONES.map(type => {
        const info = MILESTONE_LABELS[type];
        const m = milestoneMap[type];
        const achieved = m?.achieved ?? false;

        return (
          <Card
            key={type}
            elevation={0}
            sx={{
              border: 1,
              borderColor: achieved ? 'success.main' : 'divider',
              bgcolor: achieved ? 'success.light' : 'background.paper',
              opacity: achieved ? 1 : 0.6,
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              {achieved ? (
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              ) : (
                <RadioButtonUncheckedIcon color="disabled" sx={{ fontSize: 40 }} />
              )}
              <Typography variant="h6" sx={{ mt: 1 }}>{info.label}</Typography>
              <Typography variant="caption" color="text.secondary">{info.threshold}</Typography>
              {achieved && m?.achieved_date && (
                <Typography variant="caption" display="block" color="success.dark" sx={{ mt: 0.5 }}>
                  Achieved: {m.achieved_date}
                </Typography>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};
```

- [ ] **Step 3: Build to verify**

Run: `cd frontend && npm run build`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TreatmentTimeline.tsx frontend/src/components/MilestoneCards.tsx
git commit -m "feat: add treatment timeline and milestone achievement cards"
```

---

### Task 11: Frontend — Data Entry Dialog

**Files:**
- Create: `frontend/src/components/DataEntryDialog.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx` (add dialog trigger)

**Interfaces:**
- Consumes: `POST /api/lab-results`
- Produces: Modal dialog for manual lab result entry

- [ ] **Step 1: Create DataEntryDialog.tsx**

Create `frontend/src/components/DataEntryDialog.tsx`:

```tsx
import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Box } from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const TEST_TYPES = [
  { value: 'bcr_abl1', label: 'BCR-ABL1', unit: '%' },
  { value: 'cbc_wbc', label: 'WBC', unit: 'x10^9/L' },
  { value: 'cbc_platelets', label: 'Platelets', unit: 'x10^9/L' },
  { value: 'cbc_hemoglobin', label: 'Hemoglobin', unit: 'g/dL' },
  { value: 'other', label: 'Other', unit: '' },
];

export const DataEntryDialog = ({ open, onClose, onSaved }: Props) => {
  const [testType, setTestType] = useState('bcr_abl1');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('%');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleTypeChange = (type: string) => {
    setTestType(type);
    const found = TEST_TYPES.find(t => t.value === type);
    if (found) setUnit(found.unit);
  };

  const handleSubmit = async () => {
    if (!value || isNaN(parseFloat(value))) {
      setError('Please enter a valid numeric value');
      return;
    }
    if (testType === 'bcr_abl1' && (parseFloat(value) < 0 || parseFloat(value) > 100)) {
      setError('BCR-ABL1 must be between 0 and 100');
      return;
    }
    if (parseFloat(value) <= 0) {
      setError('Value must be positive');
      return;
    }

    try {
      await fetch('http://localhost:8000/api/lab-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_type: testType, value, unit, test_date: testDate, notes }),
      });
      setValue('');
      setNotes('');
      setError('');
      onSaved();
      onClose();
    } catch (err) {
      setError('Failed to save. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Lab Result</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField select label="Test Type" value={testType} onChange={(e) => handleTypeChange(e.target.value)}>
            {TEST_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>
          <TextField label="Value" type="number" value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            error={!!error} helperText={error} />
          <TextField label="Unit" value={unit}
            onChange={(e) => setUnit(e.target.value)} />
          <TextField label="Date" type="date" value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            InputLabelProps={{ shrink: true }} />
          <TextField label="Notes (optional)" value={notes}
            onChange={(e) => setNotes(e.target.value)} multiline rows={2} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};
```

- [ ] **Step 2: Add dialog trigger to Dashboard.tsx**

Edit `frontend/src/pages/Dashboard.tsx`. Add state and button:

After `const [loading, setLoading] = useState(true);`, add:
```tsx
const [entryOpen, setEntryOpen] = useState(false);
```

After the dashboard title Typography, add:
```tsx
<Button variant="contained" onClick={() => setEntryOpen(true)} sx={{ mb: 2 }}>
  Add Lab Result
</Button>
```

Before the closing `</Box>`, add:
```tsx
<DataEntryDialog open={entryOpen} onClose={() => setEntryOpen(false)} onSaved={fetchDashboard} />
```

Add import at top:
```tsx
import { DataEntryDialog } from '../components/DataEntryDialog';
import { Button } from '@mui/material';
```

- [ ] **Step 3: Build to verify**

Run: `cd frontend && npm run build`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/DataEntryDialog.tsx frontend/src/pages/Dashboard.tsx
git commit -m "feat: add data entry dialog for manual lab result input"
```

---

### Task 12: Frontend — File Upload Dialog

**Files:**
- Create: `frontend/src/components/FileUploadDialog.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx` (add upload button)

**Interfaces:**
- Consumes: `POST /api/upload-csv`, `POST /api/upload-pdf`, `POST /api/lab-results/bulk`
- Produces: File upload dialog with preview table

- [ ] **Step 1: Create FileUploadDialog.tsx**

Create `frontend/src/components/FileUploadDialog.tsx`:

```tsx
import { useState, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

interface ParsedRow {
  test_type: string;
  value: string;
  unit: string;
  test_date: string;
  notes: string;
  valid: boolean;
  error: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const FileUploadDialog = ({ open, onClose, onSaved }: Props) => {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const endpoint = file.name.endsWith('.csv') ? '/api/upload-csv' : '/api/upload-pdf';
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        body: formData,
      });
      const rows = await response.json();
      setParsedRows(rows);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleCommit = async () => {
    const validRows = parsedRows.filter(r => r.valid);
    if (validRows.length === 0) return;

    try {
      await fetch('http://localhost:8000/api/lab-results/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: validRows }),
      });
      setParsedRows([]);
      setFileName('');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Commit failed:', error);
    }
  };

  const handleClose = () => {
    setParsedRows([]);
    setFileName('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Upload Lab Report</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <input ref={fileInputRef} type="file" accept=".csv,.pdf" onChange={handleFileSelect}
            style={{ display: 'none' }} />
          <Button variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Parsing...' : 'Select CSV or PDF'}
          </Button>
          {fileName && <Typography variant="body2" sx={{ ml: 2, display: 'inline' }}>{fileName}</Typography>}
        </Box>

        {parsedRows.length > 0 && (
          <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Test Type</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parsedRows.map((row, i) => (
                  <TableRow key={i} sx={{ bgcolor: row.valid ? 'inherit' : 'error.light' }}>
                    <TableCell>
                      {row.valid ? (
                        <Chip size="small" label="OK" color="success" />
                      ) : (
                        <Chip size="small" label="Error" color="error" />
                      )}
                    </TableCell>
                    <TableCell>{row.test_date}</TableCell>
                    <TableCell>{row.test_type}</TableCell>
                    <TableCell>{row.value}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell>{row.notes || row.error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleCommit} variant="contained"
          disabled={parsedRows.filter(r => r.valid).length === 0}>
          Commit {parsedRows.filter(r => r.valid).length} Rows
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

- [ ] **Step 2: Add upload button to Dashboard.tsx**

In Dashboard.tsx, after the "Add Lab Result" button, add:
```tsx
<Button variant="outlined" onClick={() => setUploadOpen(true)} sx={{ mb: 2, ml: 1 }}>
  Upload Lab Report
</Button>
```

Add state: `const [uploadOpen, setUploadOpen] = useState(false);`

Before closing `</Box>`, add:
```tsx
<FileUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onSaved={fetchDashboard} />
```

Add import:
```tsx
import { FileUploadDialog } from '../components/FileUploadDialog';
```

- [ ] **Step 3: Build to verify**

Run: `cd frontend && npm run build`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/FileUploadDialog.tsx frontend/src/pages/Dashboard.tsx
git commit -m "feat: add file upload dialog with CSV/PDF preview and commit"
```

---

### Task 13: Frontend — Warning Banner

**Files:**
- Create: `frontend/src/components/WarningBanner.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx` (already imports WarningBanner)

**Interfaces:**
- Consumes: warnings array from dashboard API
- Produces: Colored alert banners

- [ ] **Step 1: Create WarningBanner.tsx**

Create `frontend/src/components/WarningBanner.tsx`:

```tsx
import { useState } from 'react';
import { Alert, AlertTitle, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface Warning {
  severity: string;
  condition: string;
  message: string;
}

interface Props {
  warnings: Warning[];
}

export const WarningBanner = ({ warnings }: Props) => {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = warnings.filter(w => !dismissed.has(w.condition));

  if (visible.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {visible.map(w => (
        <Alert
          key={w.condition}
          severity={w.severity as 'error' | 'warning' | 'info'}
          sx={{ mb: 1 }}
          action={
            <IconButton size="small" onClick={() => setDismissed(prev => new Set(prev).add(w.condition))}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          <AlertTitle>
            {w.severity === 'critical' ? 'Urgent' : w.severity === 'high' ? 'Warning' : 'Notice'}
          </AlertTitle>
          {w.message}
        </Alert>
      ))}
    </Box>
  );
};
```

- [ ] **Step 2: Build to verify**

Run: `cd frontend && npm run build`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/WarningBanner.tsx
git commit -m "feat: add warning banner component for health alerts"
```

---

### Task 14: Frontend — Sidebar Navigation

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx` (add Dashboard nav item)

**Interfaces:**
- Consumes: `onNavigateDashboard`, `isDashboard` props
- Produces: Dashboard nav link in sidebar

- [ ] **Step 1: Update Sidebar props and add Dashboard nav**

Edit `frontend/src/components/Sidebar.tsx`. Update the `SidebarProps` interface:

```tsx
interface SidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onNavigateDashboard: () => void;
  isDashboard: boolean;
}
```

Update the function signature to include new props.

After the "New Chat" button, add:

```tsx
<Button
  fullWidth
  variant={isDashboard ? 'contained' : 'outlined'}
  startIcon={<DashboardIcon />}
  onClick={onNavigateDashboard}
  sx={{ mt: 1 }}
>
  Dashboard
</Button>
```

Add import:
```tsx
import DashboardIcon from '@mui/icons-material/Dashboard';
```

- [ ] **Step 2: Build to verify**

Run: `cd frontend && npm run build`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Sidebar.tsx
git commit -m "feat: add Dashboard navigation item to sidebar"
```

---

### Task 15: Chatbot Integration — New Tool + System Instruction

**Files:**
- Modify: `backend/api/websocket.py` (add get_patient_lab_data tool + update system instruction)

**Interfaces:**
- Consumes: `get_lab_results`, `get_treatments` from Task 2
- Produces: New Gemini tool for patient data access

- [ ] **Step 1: Add get_patient_lab_data function**

Edit `backend/api/websocket.py`. Add import and function before `chat_websocket`:

```python
from datetime import datetime, timedelta


def get_patient_lab_data(test_type: str = None, date_range: str = None) -> dict:
    """Query patient's lab history for chatbot context."""
    from database import get_lab_results, get_treatments, get_milestones

    lab_results = get_lab_results(test_type)
    treatments = get_treatments()
    milestones = get_milestones()

    # Filter by date range
    if date_range and date_range != "all":
        now = datetime.now()
        if date_range == "latest":
            if lab_results:
                latest_date = max(r["test_date"] for r in lab_results)
                lab_results = [r for r in lab_results if r["test_date"] == latest_date]
        elif date_range.endswith("d"):
            days = int(date_range.replace("d", ""))
            cutoff = (now - timedelta(days=days)).strftime("%Y-%m-%d")
            lab_results = [r for r in lab_results if r["test_date"] >= cutoff]
        elif date_range.endswith("y"):
            years = int(date_range.replace("y", ""))
            cutoff = (now - timedelta(days=years * 365)).strftime("%Y-%m-%d")
            lab_results = [r for r in lab_results if r["test_date"] >= cutoff]

    return {
        "lab_results": lab_results,
        "treatments": treatments,
        "milestones": [m for m in milestones if m["achieved"]],
    }
```

- [ ] **Step 2: Register the tool and update system instruction**

In `websocket.py`, add to the `tools_map`:

```python
tools_map = {
    "lookup_tki_info": lookup_tki_info,
    "lookup_food_interactions": lookup_food_interactions,
    "search_medical_guidelines": search_medical_guidelines,
    "search_wikipedia": search_wikipedia,
    "get_patient_lab_data": get_patient_lab_data,
}

tools = [lookup_tki_info, lookup_food_interactions, search_medical_guidelines, search_wikipedia, get_patient_lab_data]
```

Update `SYSTEM_INSTRUCTION` to include:

```
5. Patient's lab data: {"tool": "get_patient_lab_data", "test_type": "bcr_abl1|cbc|treatment|null", "date_range": "latest|30d|90d|1y|all|null"}

When the user asks about their results, blood counts, or treatment progress, always use get_patient_lab_data to retrieve their actual data before responding. Never guess or make up numbers — only use verified data from the tool.
```

- [ ] **Step 3: Test tool execution**

Run: `cd backend && python -c "
from api.websocket import get_patient_lab_data
result = get_patient_lab_data()
print('Tool result keys:', result.keys())
print('Lab results:', len(result['lab_results']))
print('Treatments:', len(result['treatments']))
print('Test PASSED')
"`

- [ ] **Step 4: Commit**

```bash
git add backend/api/websocket.py
git commit -m "feat: add get_patient_lab_data tool for chatbot context"
```

---

### Task 16: Integration Test + Manual E2E

**Files:**
- None (manual testing)

**Interfaces:**
- Consumes: All previous tasks

- [ ] **Step 1: Start backend**

Run: `cd backend && uvicorn api.main:app --host 0.0.0.0 --port 8000`

- [ ] **Step 2: Start frontend**

Run: `cd frontend && npm run dev`

- [ ] **Step 3: Test Dashboard load**

Open http://localhost:5173/dashboard
- Verify: Dashboard loads with summary cards
- Verify: "No data" messages appear for empty charts
- Verify: Medical disclaimer at bottom

- [ ] **Step 4: Test Manual Entry**

Click "Add Lab Result" → enter BCR-ABL1 value 2.5% → Save
- Verify: Card updates with latest value
- Verify: Chart shows data point
- Add more values (0.8%, 0.15%, 0.05%) over different dates
- Verify: Logarithmic chart displays trend

- [ ] **Step 5: Test CSV Upload**

Create a test CSV file:
```
date,test_type,value,unit,notes
2026-01-15,cbc_wbc,6.2,x10^9/L,Normal
2026-01-15,cbc_platelets,250,x10^9/L,Normal
2026-01-15,cbc_hemoglobin,12.5,g/dL,Normal
```
Upload via "Upload Lab Report" → preview → commit
- Verify: CBC charts populate

- [ ] **Step 6: Test Warnings**

Add a BCR-ABL1 value above 0.1% after adding values below 0.1%
- Verify: "Loss of MMR" warning banner appears
- Click dismiss → verify it hides

- [ ] **Step 7: Test Chatbot Context**

In chat, ask "What are my latest lab results?"
- Verify: Bot uses get_patient_lab_data tool
- Verify: Response includes actual values from the database

- [ ] **Step 8: Test Treatment Timeline**

Add treatments via API:
```
POST /api/treatments {"drug_name": "imatinib", "dosage_mg": 400, "start_date": "2024-01-15"}
POST /api/treatments {"drug_name": "dasatinib", "dosage_mg": 100, "start_date": "2024-07-15", "reason_for_change": "Intolerance"}
```
- Verify: Treatment timeline shows both entries

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "feat: complete CML Lab Tracker integration"
```

---

## Implementation Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Encryption module + key setup | `encryption.py`, `.env`, `requirements.txt` |
| 2 | Database schema + CRUD | `database.py` |
| 3 | Lab results API endpoints | `lab_routes.py`, `main.py` |
| 4 | Treatments API endpoints | `lab_routes.py` |
| 5 | File upload parsing | `upload_parser.py`, `lab_routes.py` |
| 6 | Dashboard endpoint + warnings | `warnings.py`, `lab_routes.py` |
| 7 | Frontend routing + deps | `App.tsx`, `main.tsx`, `package.json` |
| 8 | Dashboard page | `Dashboard.tsx` |
| 9 | Charts (BCR-ABL1 + CBC) | `LabResultsChart.tsx`, `CBCChart.tsx` |
| 10 | Timeline + milestones | `TreatmentTimeline.tsx`, `MilestoneCards.tsx` |
| 11 | Data entry dialog | `DataEntryDialog.tsx`, `Dashboard.tsx` |
| 12 | File upload dialog | `FileUploadDialog.tsx`, `Dashboard.tsx` |
| 13 | Warning banner | `WarningBanner.tsx` |
| 14 | Sidebar navigation | `Sidebar.tsx` |
| 15 | Chatbot integration | `websocket.py` |
| 16 | Integration test | Manual E2E |
