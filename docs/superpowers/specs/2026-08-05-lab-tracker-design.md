# CML Lab Tracker — Test Results Storage, Analysis, Visualization & Chatbot Context

**Date:** 2026-08-05
**Status:** Approved
**Scope:** All-in-one spec covering data entry, storage, visualization, chatbot integration, warnings, and dashboard

---

## 1. Overview

Extend the existing CML Patient Assistant with a lab test tracking module that allows patients to record, upload, visualize, and discuss their molecular and hematological lab results. The chatbot gains full query access to the patient's test history for contextual responses.

### Goals
- Let patients manually enter or upload lab results (BCR-ABL1 transcript levels, CBC values)
- Display trend charts with ELN guideline milestone markers
- Track TKI medication history (current + past treatments)
- Enable the chatbot to query and discuss the patient's actual lab data
- Detect dangerous trends and show visual warnings
- Provide a motivational dashboard with milestone achievements
- Encrypt sensitive health data at rest

### Non-Goals (This Version)
- Multi-user / multi-patient support
- Hospital API integration
- Automated lab report OCR from images
- Email/SMS notifications
- HIPAA-certified infrastructure

---

## 2. Data Schema

Three new SQLite tables added to the existing `cml_chat_history.db`. The existing `sessions` and `messages` tables remain unchanged.

### Table: `lab_results`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `test_type` | TEXT NOT NULL | `'bcr_abl1'`, `'cbc_wbc'`, `'cbc_platelets'`, `'cbc_hemoglobin'`, `'other'` |
| `value` | TEXT NOT NULL | Fernet-encrypted numeric value |
| `unit` | TEXT NOT NULL | `'%'`, `'x10^9/L'`, `'g/dL'`, etc. |
| `reference_range` | TEXT | Optional, e.g., `'3.5-10.5'` |
| `test_date` | TEXT NOT NULL | ISO format `'YYYY-MM-DD'` |
| `notes` | TEXT | Optional patient notes |
| `created_at` | TEXT NOT NULL | Timestamp of entry |

### Table: `treatments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `drug_name` | TEXT NOT NULL | `'imatinib'`, `'dasatinib'`, `'nilotinib'`, `'bosutinib'`, `'ponatinib'`, `'asciminib'` |
| `dosage_mg` | INTEGER NOT NULL | Dosage in milligrams |
| `start_date` | TEXT NOT NULL | ISO format |
| `end_date` | TEXT | NULL if this is the current treatment |
| `reason_for_change` | TEXT | Optional |
| `created_at` | TEXT NOT NULL | Timestamp |

### Table: `milestones`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `milestone_type` | TEXT NOT NULL | `'ccyr'`, `'mmr'`, `'mr4'`, `'mr4_5'`, `'mrd_negative'` |
| `achieved` | INTEGER NOT NULL | 0 or 1 |
| `achieved_date` | TEXT | When achieved |
| `value_at_achievement` | TEXT | Encrypted BCR-ABL1 value at achievement |

### Seed Data: ELN Milestones

Pre-populated on first run for reference (not stored in DB, computed at display time):
- CCyR (Complete Cytogenetic Response): BCR-ABL1 ≤ 1% at 6 months
- MMR (Major Molecular Response): BCR-ABL1 ≤ 0.1% at 12 months
- MR4: BCR-ABL1 ≤ 0.01%
- MR4.5: BCR-ABL1 ≤ 0.0032%

---

## 3. Backend API Endpoints

All new endpoints are added to the existing FastAPI router in `backend/api/routes.py`.

### Lab Results

| Method | Endpoint | Request Body | Response | Description |
|--------|----------|-------------|----------|-------------|
| `GET` | `/api/lab-results?test_type=bcr_abl1` | - | `[{id, test_type, value, unit, reference_range, test_date, notes, created_at}]` | List all lab results (optional filter) |
| `POST` | `/api/lab-results` | `{test_type, value, unit, reference_range?, test_date, notes?}` | `{id, test_type, value, unit, test_date}` | Add a new lab result |
| `PUT` | `/api/lab-results/{id}` | `{test_type?, value?, unit?, reference_range?, test_date?, notes?}` | `{message}` | Edit a lab result |
| `DELETE` | `/api/lab-results/{id}` | - | `{message}` | Delete a lab result |

### Treatments

| Method | Endpoint | Request Body | Response | Description |
|--------|----------|-------------|----------|-------------|
| `GET` | `/api/treatments` | - | `[{id, drug_name, dosage_mg, start_date, end_date, reason_for_change}]` | List all treatments |
| `POST` | `/api/treatments` | `{drug_name, dosage_mg, start_date, end_date?, reason_for_change?}` | `{id, drug_name, dosage_mg, start_date}` | Add a new treatment |
| `PUT` | `/api/treatments/{id}` | `{drug_name?, dosage_mg?, start_date?, end_date?, reason_for_change?}` | `{message}` | Edit a treatment |
| `DELETE` | `/api/treatments/{id}` | - | `{message}` | Delete a treatment |

### File Upload

| Method | Endpoint | Request Body | Response | Description |
|--------|----------|-------------|----------|-------------|
| `POST` | `/api/upload-csv` | `multipart/form-data` (file) | `[{test_type, value, unit, test_date, notes, valid, error?}]` | Parse CSV, return preview rows |
| `POST` | `/api/upload-pdf` | `multipart/form-data` (file) | `[{test_type, value, unit, test_date, notes, valid, error?}]` | Parse PDF, return preview rows |
| `POST` | `/api/lab-results/bulk` | `{results: [{test_type, value, unit, test_date, notes?}]}` | `{created: number}` | Commit previewed rows |

### Dashboard

| Method | Endpoint | Response | Description |
|--------|----------|----------|-------------|
| `GET` | `/api/dashboard` | `{latest_values, trends, current_treatment, warnings, milestones}` | Aggregated dashboard data |

The `warnings` array contains `{severity, message, condition}` objects computed fresh on each request.

---

## 4. Frontend Components

### 4.1 Dashboard Page (new route `/dashboard`)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [Warning Banner - if active]                    │
├─────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ BCR-ABL1 │ │ WBC      │ │ Current  │         │
│ │ 0.05%    │ │ 6.2      │ │ Dasatinib│         │
│ │ ↓ MMR    │ │ Normal   │ │ 100mg    │         │
│ └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│ BCR-ABL1 Trend (Log Scale)                      │
│ ─────────────────────────────────────────────── │
│   100% ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (3mo: 10%)         │
│   10%  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (6mo: 1%)          │
│   1%   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (12mo: 0.1%)       │
│   0.1% ──────────────────── MMR line            │
│   0.01%───●────●────●────●                      │
│   0.001%                                           │
│        Jan  Apr  Jul  Oct  Jan                  │
├─────────────────────────────────────────────────┤
│ CBC Trends                                       │
│ ┌────────────────┐ ┌────────────────┐           │
│ │ WBC            │ │ Platelets      │           │
│ │ [line chart]   │ │ [line chart]   │           │
│ └────────────────┘ └────────────────┘           │
├─────────────────────────────────────────────────┤
│ Treatment Timeline                               │
│ Imatinib 400mg ──→ Dasatinib 100mg ──→ current │
│ Jan 2024        Jul 2024               present  │
├─────────────────────────────────────────────────┤
│ Achievements                                     │
│ ┌──────┐ ┌──────┐ ┌──────┐                     │
│ │ CCyR │ │ MMR  │ │ MR4  │                     │
│ │ ✓    │ │ ✓    │ │      │                     │
│ └──────┘ └──────┘ └──────┘                     │
└─────────────────────────────────────────────────┘
```

**Summary Cards:** Three cards showing latest BCR-ABL1, latest WBC, and current TKI. Each card has a colored status indicator (green = normal, yellow = borderline, red = concerning).

**BCR-ABL1 Chart:** MUI X Charts `LineChart` with logarithmic Y-axis. ELN milestone horizontal dashed lines at 10%, 1%, and 0.1%. Data points as dots with tooltips showing exact value and date.

**CBC Charts:** Two smaller `LineChart` components for WBC and Platelets on linear scale. Reference range shown as shaded band.

**Treatment Timeline:** Horizontal timeline using MUI `Timeline` component. Each treatment is a node with drug name, dosage, and date range. Current treatment highlighted.

**Achievements:** Grid of cards. Achieved milestones shown with green checkmark and celebration color. Unachieved shown as greyed out with target value.

### 4.2 Data Entry Dialog (modal)

- Triggered by "Add Lab Result" button on dashboard
- MUI `Dialog` with form fields:
  - Test type: `Select` dropdown (`BCR-ABL1`, `WBC`, `Platelets`, `Hemoglobin`, `Other`)
  - Value: `TextField` with numeric validation
  - Unit: Auto-populated based on test type, editable
  - Date: `DatePicker` (defaults to today)
  - Notes: Optional `TextField`
- Validation: BCR-ABL1 must be 0-100%, CBC values must be positive
- On submit: POST to `/api/lab-results`, refresh dashboard

### 4.3 File Upload Component

- Triggered by "Upload Lab Report" button on dashboard
- MUI `Dialog` with:
  - Drag-and-drop zone (styled `Box` with dashed border)
  - File picker button
  - Accept: `.csv`, `.pdf`
- On file drop:
  - Send to `/api/upload-csv` or `/api/upload-pdf`
  - Show preview table with parsed rows
  - Each row: editable fields, valid/invalid indicator
  - "Commit All" button → POST to `/api/lab-results/bulk`

**CSV Expected Format:**
```
date,test_type,value,unit,notes
2026-01-15,bcr_abl1,2.5,%,Initial diagnosis
2026-04-15,bcr_abl1,0.8,%,3-month check
```

**PDF Parsing:**
- Extract text via PyPDF2
- Pattern match for keywords: `BCR-ABL`, `ABL`, `International Scale`, `WBC`, `Platelet`, `Hemoglobin`
- Extract adjacent numeric values
- Parse dates in common formats (MM/DD/YYYY, YYYY-MM-DD, DD-Mon-YYYY)
- If parsing fails: "Could not parse PDF — please enter values manually"

### 4.4 Sidebar Navigation

Add a new nav item to the existing `Sidebar.tsx`:
- Icon: `DashboardIcon` from `@mui/icons-material/Dashboard`
- Label: "Dashboard"
- Position: Below "New Chat" button, above session list
- Active state: purple accent when on `/dashboard` route
- Clicking navigates to `/dashboard`

### 4.5 Chat Message Integration

When the patient asks about their results in chat:
- The chatbot's response includes inline data references
- Example: "Your latest BCR-ABL1 is **0.05%** (as of 2026-07-15), which is below the MMR threshold of 0.1%. This is excellent progress!"
- Values are displayed in bold for emphasis

---

## 5. Chatbot Context Integration

### New Tool: `get_patient_lab_data`

Registered alongside the existing 4 tools in `backend/api/websocket.py`.

**Function signature:**
```python
def get_patient_lab_data(test_type: str = None, date_range: str = None) -> dict:
    """
    Query the patient's lab history for contextual chat responses.

    Args:
        test_type: 'bcr_abl1', 'cbc', 'treatment', or None (all)
        date_range: 'latest', '30d', '90d', '1y', 'all', or None (all)

    Returns:
        dict with 'results' key containing the relevant data
    """
```

**Implementation:**
1. Query `lab_results` and/or `treatments` tables based on filters
2. Decrypt values using Fernet
3. Return structured JSON: `{results: [{test_type, value, unit, test_date}...]}`

**Context Injection Flow:**
1. Patient sends message via WebSocket
2. Backend sends to Gemini with all 5 tools
3. If Gemini calls `get_patient_lab_data`:
   - Backend executes the tool
   - Sends `tool_call` and `tool_result` messages to frontend
   - Appends tool result to conversation contents
4. Gemini synthesizes the data into a compassionate response
5. Response streamed to frontend via existing token protocol

### System Instruction Update

Add to the existing system instruction:
```
You have access to FIVE tools:
1. Side effects/red flags: lookup_tki_info
2. Dietary/food rules: lookup_food_interactions
3. Official CML guidelines PDF: search_medical_guidelines
4. General knowledge via Wikipedia: search_wikipedia
5. Patient's lab data: get_patient_lab_data

When the user asks about their results, blood counts, or treatment progress,
always use get_patient_lab_data to retrieve their actual data before responding.
Never guess or make up numbers — only use verified data from the tool.
```

---

## 6. Warning System

### Trend Detection Logic

The `check_trends()` function runs on every `/api/dashboard` request.

**Warning Conditions:**

| Condition | Trigger | Severity | Message |
|-----------|---------|----------|---------|
| Rising BCR-ABL1 | Last 2+ values increasing with >0.01% absolute increase | High | "Your BCR-ABL1 levels have been trending upward. Please discuss with your hematologist." |
| Loss of MMR | BCR-ABL1 rises above 0.1% after being below | Critical | "Your BCR-ABL1 has risen above the MMR threshold (0.1%). Contact your hematologist urgently." |
| Loss of CCyR | BCR-ABL1 rises above 1% after being below | Critical | "Your BCR-ABL1 has risen above 1%. This requires immediate medical attention." |
| Severe Neutropenia | WBC < 1.0 x10^9/L | Critical | "Your WBC is critically low. Seek immediate medical attention." |
| Severe Thrombocytopenia | Platelets < 50 x10^9/L | High | "Your platelet count is dangerously low. Contact your doctor." |
| Severe Anemia | Hemoglobin < 7.0 g/dL | High | "Your hemoglobin is severely low. Contact your doctor." |
| Stale Data | No lab results in 180+ days | Medium | "It's been over 6 months since your last lab test. Please schedule a check-up." |

### Frontend Rendering

- **Critical:** Full-width red banner at top of dashboard with `WarningIcon` and white text
- **High:** Orange banner, slightly smaller
- **Medium:** Yellow info banner with `InfoIcon`
- **Dismissable:** Patient can click X to dismiss for the session; warnings re-appear on next page load
- **Chat Integration:** When warnings are active, the chatbot preamble includes: "Note: There are active health alerts for this patient. [warning summary]"

---

## 7. Encryption & Privacy

### Fernet Symmetric Encryption

- **Library:** `cryptography.fernet`
- **Key:** Generated once, stored in `.env` as `ENCRYPTION_KEY`
- **Key generation:** `Fernet.generate_key()` produces a 32-byte url-safe base64 key

**What's encrypted:**
- `lab_results.value` — all numeric lab values
- `milestones.value_at_achievement` — the BCR-ABL1 value at milestone

**What's NOT encrypted (remains plaintext):**
- `lab_results.test_date`, `test_type`, `unit`, `notes`
- `treatments.*` — drug names and dates are not sensitive
- `sessions.*`, `messages.*` — existing chat data

### Encryption Module

New file `backend/encryption.py`:
```python
from cryptography.fernet import Fernet
import os

_key = os.getenv("ENCRYPTION_KEY")
fernet = Fernet(_key) if _key else None

def encrypt_value(plaintext: str) -> str:
    if not fernet:
        return plaintext
    return fernet.encrypt(plaintext.encode()).decode()

def decrypt_value(ciphertext: str) -> str:
    if not fernet:
        return ciphertext
    return fernet.decrypt(ciphertext.encode()).decode()
```

### Integration in database.py

- `save_lab_result()`: encrypt value before INSERT
- `get_lab_results()`: decrypt value after SELECT
- `save_milestone()`: encrypt value_at_achievement before INSERT
- `get_milestones()`: decrypt value_at_achievement after SELECT

### Additional Privacy Measures

- All API traffic over localhost (no external exposure)
- CORS restricted to `localhost:3000` and `localhost:5173`
- No analytics, no tracking, no external data transmission
- Medical disclaimer in app footer: "This app is for informational and tracking support only and does not replace professional medical diagnosis, advice, or treatment."

---

## 8. File Structure Changes

### New Files
```
backend/
  encryption.py          # Fernet encrypt/decrypt helpers
  api/
    lab_routes.py        # Lab results, treatments, upload, dashboard endpoints
    upload_parser.py     # CSV and PDF parsing logic

frontend/
  src/
    pages/
      Dashboard.tsx      # Main dashboard page
    components/
      LabResultsChart.tsx    # BCR-ABL1 logarithmic chart
      CBCChart.tsx           # CBC trend charts
      TreatmentTimeline.tsx  # Treatment history timeline
      MilestoneCards.tsx     # Achievement cards
      DataEntryDialog.tsx    # Manual lab result entry form
      FileUploadDialog.tsx   # CSV/PDF upload with preview
      WarningBanner.tsx      # Alert banner component
```

### Modified Files
```
backend/
  database.py            # Add new tables, CRUD functions, encryption integration
  api/main.py            # Include lab_routes router
  api/websocket.py       # Register get_patient_lab_data tool, update system instruction
  requirements.txt       # Add cryptography

frontend/
  src/
    App.tsx              # Add /dashboard route, navigation state
    components/
      Sidebar.tsx        # Add Dashboard nav item
    theme/
      ThemeProvider.tsx   # Add MUI X Charts theme extensions
  package.json           # Add @mui/x-charts, react-router-dom
```

---

## 9. Dependencies

### Backend (additions to requirements.txt)
```
cryptography>=42.0.0
python-multipart>=0.0.6
```

### Frontend (additions to package.json)
```
@mui/x-charts
react-router-dom
```

---

## 10. Testing Strategy

### Backend
- Unit tests for `encryption.py` (encrypt/decrypt round-trip)
- Unit tests for `upload_parser.py` (CSV parsing, PDF parsing)
- API tests for all CRUD endpoints (create, read, update, delete lab results and treatments)
- Integration test: upload CSV → verify stored values are encrypted → query API → verify decrypted values match

### Frontend
- Component tests for Dashboard, DataEntryDialog, FileUploadDialog
- Integration test: add lab result via form → verify chart updates
- Visual regression: chart rendering with known data sets

### Manual Testing
- End-to-end flow: add BCR-ABL1 values manually → view chart → verify ELN milestones → check chatbot can query data → verify warning triggers
- CSV upload flow: upload sample CSV → preview → commit → verify data
- PDF upload flow: upload sample PDF → preview → commit → verify data

---

## 11. Implementation Order

1. **Encryption module** — `backend/encryption.py` + key generation
2. **Database schema** — new tables in `database.py` + CRUD functions
3. **Backend API** — lab_routes.py with all endpoints
4. **File upload parsing** — upload_parser.py (CSV + PDF)
5. **Dashboard frontend** — Dashboard.tsx page with summary cards
6. **Charts** — LabResultsChart.tsx, CBCChart.tsx with MUI X Charts
7. **Treatment timeline** — TreatmentTimeline.tsx
8. **Data entry dialog** — DataEntryDialog.tsx
9. **File upload dialog** — FileUploadDialog.tsx with preview
10. **Warning system** — check_trends() + WarningBanner.tsx
11. **Milestone cards** — MilestoneCards.tsx
12. **Sidebar navigation** — add Dashboard link to Sidebar.tsx
13. **Chatbot integration** — get_patient_lab_data tool + system instruction update
14. **Testing** — unit tests, integration tests, manual E2E
