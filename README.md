<h1 align="center">CML Patient Assistant</h1>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/FastAPI-0.104+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI">
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
</p>

<p align="center">
  <strong>Your personalized AI companion for navigating CML treatment</strong>
</p>

<p align="center">
  A comprehensive web application for Chronic Myeloid Leukemia (CML) patients to manage TKI side effects, track lab results, and monitor their treatment journey with AI-powered assistance.
</p>

---

## Features

### AI Chat Assistant

| Feature | Description |
|---------|-------------|
| **TKI Information** | Detailed side effects and clinical red flags for 6 major TKIs (Imatinib, Dasatinib, Nilotinib, Bosutinib, Ponatinib, Asciminib) |
| **Drug Interactions** | Food rules, fasting requirements, antacid timing, and supplement exclusions |
| **RAG-Powered Search** | Intelligent search over official CML guidelines using ChromaDB vector database |
| **Lab Data Access** | Chat retrieves your actual lab results to answer questions about your progress |
| **Streaming Responses** | Real-time token-by-token responses via WebSocket |

### Lab Tracker Dashboard

| Feature | Description |
|---------|-------------|
| **Manual Entry** | Add lab results (BCR-ABL1, WBC, Platelets, Hemoglobin, RBC, Blast %, Basophils, Eosinophils) via form |
| **File Upload** | Import CSV, PDF, or image lab reports with OCR parsing and validation |
| **Trend Charts** | Color-coded bar charts with zone indicators for BCR-ABL1 and CBC tests |
| **Treatment Timeline** | Visual history of TKI medications with current treatment badge |
| **Milestone Tracking** | CCyR, MMR, MR4, MR4.5 achievement cards with auto-recalculation |
| **Smart Warnings** | Automatic alerts for rising BCR-ABL1, severe cytopenias, and stale data |
| **Checkup Records** | Track doctor visits with multiple medications and costs |
| **Next Checkup** | Upcoming appointment date with countdown and "items to bring" checklist |

### Security & Multi-User

| Feature | Description |
|---------|-------------|
| **Google OAuth** | Secure authentication via Google Sign-In |
| **Data Isolation** | Complete user-level data separation across all tables |
| **Encryption** | Fernet symmetric encryption for lab values at rest |
| **JWT Tokens** | Secure API and WebSocket authentication (24-hour expiry) |

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                           Frontend                              │
│  React 19 • TypeScript • Vite 8 • MUI 6 • MUI X Charts         │
├─────────────────────────────────────────────────────────────────┤
│                           Backend                               │
│  Python 3.12 • FastAPI • WebSocket • SQLite                     │
├─────────────────────────────────────────────────────────────────┤
│                           AI Layer                              │
│  Gemini API • ChromaDB (RAG) • RapidOCR • PyPDF2                │
├─────────────────────────────────────────────────────────────────┤
│                         Infrastructure                          │
│  Google OAuth 2.0 • JWT • Fernet Encryption                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- **Python 3.12+**
- **Node.js 20+**
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))
- **Google Cloud Console** project with OAuth credentials (for authentication)

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-username/cml-patient-assistant.git
cd cml-patient-assistant

# Install backend dependencies
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
```

Required environment variables:

| Variable | Description | How to get |
|----------|-------------|------------|
| `GEMINI_API_KEY` | Google Gemini API key | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `JWT_SECRET` | Secret for JWT tokens | Generate: `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google Cloud Console |
| `FRONTEND_URL` | Your app URL | `http://localhost:5173` for local |
| `ENCRYPTION_KEY` | Fernet key for lab values | Optional: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |

### 3. Run Locally

```bash
# Terminal 1: Backend
cd backend
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
cml-patient-assistant/
├── backend/
│   ├── api/
│   │   ├── main.py              # FastAPI app, CORS, middleware, startup events
│   │   ├── routes.py            # Session CRUD endpoints
│   │   ├── lab_routes.py        # Lab results, treatments, dashboard, milestones
│   │   ├── auth_routes.py       # Google OAuth endpoints
│   │   ├── upload_parser.py     # CSV, PDF, image parsing with regex patterns
│   │   └── websocket.py         # WebSocket chat handler with Gemini tool loop
│   ├── agent/
│   │   ├── agent.py             # Gemini client setup with retry logic
│   │   └── tools/
│   │       ├── tki_info.py      # TKI side effects database (6 drugs)
│   │       ├── food_rules.py    # Dietary interactions database (6 drugs)
│   │       ├── rag_search.py    # ChromaDB PDF ingestion + vector search
│   │       └── wiki_search.py   # Wikipedia fallback search
│   ├── tests/
│   │   ├── test_database.py     # Database schema, user CRUD, data isolation
│   │   ├── test_auth.py         # JWT creation and verification
│   │   ├── test_upload_parser.py
│   │   ├── test_upload_integration.py
│   │   └── test_lab_routes.py
│   ├── auth.py                  # JWT creation/verification, FastAPI dependency
│   ├── database.py              # SQLite operations, schema, migrations
│   ├── encryption.py            # Fernet encryption/decryption
│   ├── lab_warnings.py          # Trend analysis & clinical warning generation
│   ├── cml_guide.pdf            # Medical guidelines for RAG ingestion
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # React entry point, routing
│   │   ├── App.tsx              # Main layout (sidebar + chat/dashboard)
│   │   ├── api.ts               # ApiClient class (REST + WebSocket)
│   │   ├── index.css            # Global styles, animations, fonts
│   │   ├── context/
│   │   │   └── AuthContext.tsx   # Authentication state management
│   │   ├── theme/
│   │   │   └── ThemeProvider.tsx # MUI theme config (dark/light)
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx    # Google OAuth login page
│   │   │   └── Dashboard.tsx    # Full dashboard with charts and data
│   │   ├── components/
│   │   │   ├── Sidebar.tsx      # Collapsible navigation drawer
│   │   │   ├── ChatMessage.tsx  # Message bubble with markdown
│   │   │   ├── ChatInput.tsx    # Multi-line chat input
│   │   │   ├── LabResultsChart.tsx  # BCR-ABL1 zone bar + chart
│   │   │   ├── CBCResults.tsx   # CBC test zone bar + chart
│   │   │   ├── TreatmentTimeline.tsx  # Visual treatment history
│   │   │   ├── MilestoneCards.tsx     # Achievement cards
│   │   │   ├── WarningBanner.tsx      # Clinical warning alerts
│   │   │   ├── DataEntryDialog.tsx    # Lab result entry form
│   │   │   ├── TreatmentEntryDialog.tsx  # Treatment entry form
│   │   │   ├── FileUploadDialog.tsx   # CSV/PDF/image upload
│   │   │   ├── CheckupRecords.tsx     # Doctor visit records
│   │   │   ├── NextCheckup.tsx        # Upcoming appointment
│   │   │   ├── LabSummaryTable.tsx    # Date-grouped overview
│   │   │   ├── LabResultsTable.tsx    # Full results table
│   │   │   └── ProtectedRoute.tsx     # Auth guard wrapper
│   │   └── utils/
│   │       └── formatDate.ts    # Date formatting utility
│   ├── package.json
│   └── vite.config.ts
├── .env.example
└── README.md
```

---

## API Reference

### REST Endpoints

#### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/google` | Redirect to Google OAuth consent screen |
| `GET` | `/auth/google/callback` | OAuth callback; creates user, issues JWT |
| `GET` | `/auth/me` | Get current user profile |

#### Chat Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sessions` | List all user sessions |
| `POST` | `/api/sessions` | Create new session |
| `PUT` | `/api/sessions/{id}` | Rename session |
| `DELETE` | `/api/sessions/{id}` | Delete session and messages |
| `GET` | `/api/sessions/{id}/messages` | Get session messages |

#### Lab Results

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/lab-results` | List lab results (optional `?test_type=` filter) |
| `POST` | `/api/lab-results` | Add lab result |
| `PUT` | `/api/lab-results/{id}` | Update lab result |
| `DELETE` | `/api/lab-results/{id}` | Delete lab result |
| `POST` | `/api/lab-results/bulk` | Bulk import results |

#### Treatments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/treatments` | List treatments |
| `POST` | `/api/treatments` | Add treatment |
| `PUT` | `/api/treatments/{id}` | Update treatment |
| `DELETE` | `/api/treatments/{id}` | Delete treatment |

#### Dashboard & Milestones

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Get dashboard data (latest values, warnings, milestones) |
| `GET` | `/api/milestones` | List all milestones |

#### Checkup Records

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/checkup-records` | List checkup records |
| `POST` | `/api/checkup-records` | Create checkup record |
| `PUT` | `/api/checkup-records/{id}` | Update checkup record |
| `DELETE` | `/api/checkup-records/{id}` | Delete checkup record |

#### User Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings/{key}` | Get user setting |
| `POST` | `/api/settings` | Save user setting (query params: `key`, `value`) |

#### File Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload-csv` | Parse CSV lab report |
| `POST` | `/api/upload-pdf` | Parse PDF lab report |
| `POST` | `/api/upload-image` | Parse image lab report via OCR |

#### Data Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `DELETE` | `/api/reset` | Delete all user data (lab results, treatments, milestones, sessions, checkup records) |

### WebSocket

Connect to `ws://localhost:8000/ws/chat?token=<jwt>`

**Message Flow:**

```
Client → Server:
{
  "type": "chat",
  "session_id": "abc123",
  "message": "What are the side effects of Imatinib?"
}

Server → Client:
{"type": "status", "content": "Thinking..."}
{"type": "tool_call", "tool": "tki_info", "args": {"drug_name": "Imatinib"}}
{"type": "tool_result", "tool": "tki_info", "result": "..."}
{"type": "token", "content": "Imatinib "}
{"type": "token", "content": "commonly causes..."}
{"type": "complete", "full_response": "Imatinib commonly causes..."}
```

---

## Database Schema

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `users` | `user_id` (PK), `email`, `name`, `picture_url` | User accounts |
| `sessions` | `session_id` (PK), `title`, `user_id` (FK) | Chat sessions |
| `messages` | `id` (PK), `session_id` (FK), `role`, `content` | Chat messages |
| `lab_results` | `id` (PK), `test_type`, `value`, `unit`, `test_date`, `user_id` (FK) | Lab results (encrypted) |
| `treatments` | `id` (PK), `drug_name`, `dosage_mg`, `start_date`, `user_id` (FK) | TKI treatments |
| `milestones` | `id` (PK), `milestone_type`, `achieved`, `user_id` (FK) | Treatment milestones |
| `checkup_records` | `id` (PK), `checkup_date`, `doctor_advice`, `medications_bought`, `user_id` (FK) | Doctor visits |
| `user_settings` | `key` + `user_id` (composite PK), `value` | User preferences |

---

## Medical Data

### Supported TKIs

| Drug | Brand Name | Common Side Effects |
|------|------------|---------------------|
| Imatinib | Gleevec | Edema, nausea, muscle cramps, rash |
| Dasatinib | Sprycel | Pleural effusion, bleeding, infections |
| Nilotinib | Tasigna | QT prolongation, vascular events |
| Bosutinib | Bosulif | Diarrhea, rash, liver toxicity |
| Ponatinib | Iclusig | Hypertension, thrombosis, pancreatitis |
| Asciminib | Scemblix | Upper respiratory infections, musculoskeletal pain |

### Treatment Response Thresholds

| Milestone | BCR-ABL1 Threshold | Description |
|-----------|-------------------|-------------|
| CCyR | ≤ 1.0% | Complete cytogenetic response |
| MMR | ≤ 0.1% | Major molecular response |
| MR4 | ≤ 0.01% | Molecular response 4 |
| MR4.5 | ≤ 0.0032% | Deep molecular response |

### CBC Normal Ranges

| Test | Normal Range | Unit |
|------|--------------|------|
| WBC | 4.5 – 11.0 | K/µL |
| Platelets | 150 – 400 | K/µL |
| Hemoglobin | 12.0 – 17.0 | g/dL |
| RBC | 4.0 – 5.5 | M/µL |

---

## Testing

```bash
# Run all backend tests
cd backend
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_database.py -v
```

---

## Development

### Available Scripts

**Frontend:**
```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run lint     # Run OxLint
npm run preview  # Preview production build
```

**Backend:**
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload  # Dev server
python -m pytest tests/ -v                                  # Run tests
```

### Code Style

- **Backend**: Follow PEP 8
- **Frontend**: OxLint + TypeScript strict mode

---

## Medical Disclaimer

> **This application is for informational and tracking support only.**
>
> It does not replace professional medical diagnosis, advice, or treatment. Always consult your hematologist or oncologist before making any changes to your treatment plan.
>
> The AI assistant provides general medical information based on published guidelines. It cannot access real-time medical data or replace clinical judgment.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Google Gemini API](https://ai.google.dev/) for AI capabilities
- [ChromaDB](https://www.trychroma.com/) for vector search
- [RapidOCR](https://github.com/RapidAI/RapidOCR) for image-based lab report parsing
- [MUI](https://mui.com/) for Material-UI components
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- CML medical guidelines and research papers

---

<p align="center">
  Built with care for the CML community
</p>
