<!-- prettier-ignore -->
<div align="center">

<img src="./frontend/public/hospital.png" alt="CML Assistant" align="center" height="72" />

# CML Patient Assistant

**Your personalized AI companion for navigating CML treatment.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

A comprehensive web application for Chronic Myeloid Leukemia (CML) patients to track lab results, manage TKI side effects, and chat with an AI assistant that understands their treatment journey.

</div>

---

## Overview

CML Patient Assistant combines a real-time AI chat with a clinical-grade lab dashboard. The AI uses Retrieval-Augmented Generation over official CML guidelines and has access to your actual lab data, so answers are grounded in your numbers -- not generic advice.

The dashboard visualizes BCR-ABL1 trends, CBC panels, treatment history, and milestone progress (CCyR, MMR, MR4, MR4.5) with automatic clinical warnings when values fall outside safe ranges.

> [!IMPORTANT]
> This application is for informational and tracking support only. It does not replace professional medical advice. Always consult your healthcare provider before making changes to your treatment.

## Features

### AI Chat

| Capability | Details |
|:---|:---|
| **TKI knowledge** | Side effects, red flags, and drug interactions for 6 major TKIs |
| **RAG search** | Vector search over CML medical guidelines (ChromaDB) |
| **Lab-aware** | Retrieves your actual lab results, treatments, and milestones to answer questions |
| **Streaming** | Real-time token-by-token responses via WebSocket |
| **Per-user API keys** | Each user provides their own Gemini key (encrypted at rest) |

### Lab Dashboard

| Capability | Details |
|:---|:---|
| **Manual entry** | BCR-ABL1, WBC, Platelets, Hemoglobin, RBC, Blast %, Basophils, Eosinophils |
| **File import** | CSV, PDF, or image lab reports with OCR parsing |
| **Trend charts** | Color-coded zone indicators for BCR-ABL1 and CBC tests |
| **Milestones** | CCyR, MMR, MR4, MR4.5 achievement cards with auto-recalculation |
| **Clinical warnings** | Rising BCR-ABL1, loss of MMR/CCyR, severe cytopenias, stale data |
| **Treatment timeline** | Visual history of TKI medications |
| **Checkup records** | Doctor visits, medications bought, costs, and next appointment countdown |

### Security

| Capability | Details |
|:---|:---|
| **Google OAuth** | Secure authentication via Google Sign-In |
| **Data isolation** | Complete user-level separation across all tables |
| **Encryption** | Fernet symmetric encryption for lab values and API keys at rest |
| **JWT tokens** | 24-hour expiry for API and WebSocket authentication |

## Getting started

### Prerequisites

- Python 3.12+
- Node.js 20+
- A [Google Gemini API key](https://aistudio.google.com/apikey)
- A [Google Cloud Console](https://console.cloud.google.com/apis/credentials) project with OAuth 2.0 credentials
- A PostgreSQL database (local or [Supabase](https://supabase.com))

### 1. Clone and install

```bash
git clone https://github.com/your-username/cml-patient-assistant.git
cd cml-patient-assistant

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Set the following variables in `.env`:

| Variable | Description | How to generate |
|:---|:---|:---|
| `DATABASE_URL` | PostgreSQL connection string | Supabase Settings > Database > Connection string (port 6543) |
| `JWT_SECRET` | Secret for JWT signing | `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `ENCRYPTION_KEY` | Fernet key for encryption | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google Cloud Console > Credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google Cloud Console > Credentials |
| `FRONTEND_URL` | Frontend URL for OAuth callback | `http://localhost:5173` for local development |

### 3. Start the servers

```bash
# Backend (terminal 1)
cd backend
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (terminal 2)
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Run tests

```bash
cd backend
python -m pytest tests/ -v
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Vercel (Frontend)                                           │
│  React 19 · TypeScript · Vite · MUI · MUI X Charts           │
├──────────────────────────────────────────────────────────────┤
│  Railway (Backend)                                           │
│  FastAPI · WebSocket · ChromaDB · RapidOCR                   │
├──────────────────────────────────────────────────────────────┤
│  Supabase (Database)                                         │
│  PostgreSQL · Fernet encryption · Per-user data isolation    │
└──────────────────────────────────────────────────────────────┘
```

### Project structure

```
cml-patient-assistant/
├── backend/
│   ├── api/
│   │   ├── main.py              # FastAPI app, CORS, startup
│   │   ├── routes.py            # Session CRUD
│   │   ├── lab_routes.py        # Lab results, treatments, dashboard, milestones
│   │   ├── auth_routes.py       # Google OAuth
│   │   ├── upload_parser.py     # CSV, PDF, image parsing
│   │   └── websocket.py         # WebSocket chat with Gemini tool loop
│   ├── agent/
│   │   ├── agent.py             # Gemini client with retry logic
│   │   └── tools/
│   │       ├── tki_info.py      # TKI side effects (6 drugs)
│   │       ├── food_rules.py    # Dietary interactions (6 drugs)
│   │       ├── rag_search.py    # ChromaDB PDF ingestion + search
│   │       └── wiki_search.py   # Wikipedia fallback
│   ├── tests/
│   ├── auth.py                  # JWT creation/verification
│   ├── database.py              # PostgreSQL operations
│   ├── encryption.py            # Fernet encryption
│   ├── lab_warnings.py          # Clinical warning generation
│   └── cml_guide.pdf            # Medical guidelines for RAG
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main layout
│   │   ├── api.ts               # REST + WebSocket client
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx    # Lab dashboard with charts
│   │   │   ├── LoginPage.tsx    # Google OAuth login
│   │   │   └── Settings.tsx     # API key management
│   │   └── components/
│   │       ├── Sidebar.tsx      # Collapsible navigation
│   │       ├── LabResultsChart.tsx
│   │       ├── CBCResults.tsx
│   │       ├── TreatmentTimeline.tsx
│   │       ├── MilestoneCards.tsx
│   │       ├── WarningBanner.tsx
│   │       └── ...              # 15+ components
│   └── vercel.json
├── docs/
│   └── DEPLOYMENT.md            # Full deployment guide
└── .env.example
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full guide.

**Quick summary:**

1. **Supabase** -- Create a project, copy the connection string (port 6543)
2. **Railway** -- Deploy from GitHub, set environment variables, generate a domain
3. **Vercel** -- Import repo, set root to `frontend/`, set `VITE_API_URL` to your Railway URL
4. **Google Cloud Console** -- Add Railway callback URL to OAuth redirect URIs

## API reference

### REST

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/auth/google` | Redirect to Google OAuth |
| `GET` | `/auth/google/callback` | OAuth callback, issues JWT |
| `GET` | `/auth/me` | Current user profile |
| `GET` | `/api/sessions` | List chat sessions |
| `POST` | `/api/sessions` | Create session |
| `GET` | `/api/sessions/{id}/messages` | Get session messages |
| `GET` | `/api/lab-results` | List lab results |
| `POST` | `/api/lab-results` | Add lab result |
| `POST` | `/api/lab-results/bulk` | Bulk import |
| `GET` | `/api/treatments` | List treatments |
| `POST` | `/api/treatments` | Add treatment |
| `GET` | `/api/dashboard/full` | Aggregate all dashboard data |
| `GET` | `/api/milestones` | List milestones |
| `GET` | `/api/checkup-records` | List checkup records |
| `GET` | `/api/settings/has-key` | Check if API key is configured |
| `POST` | `/api/settings/validate-key` | Validate a Gemini API key |
| `POST` | `/api/upload-csv` | Parse CSV lab report |
| `POST` | `/api/upload-pdf` | Parse PDF lab report |
| `POST` | `/api/upload-image` | Parse image lab report (OCR) |
| `DELETE` | `/api/reset` | Delete all user data |

After starting the backend, visit `/docs` for the auto-generated Swagger UI.

### WebSocket

Connect to `ws://localhost:8000/ws/chat?token=<jwt>`.

```
Client → Server:
{"type": "chat", "session_id": "...", "message": "What are the side effects of Imatinib?"}

Server → Client:
{"type": "status", "content": "Thinking..."}
{"type": "tool_call", "tool": "lookup_tki_info", "args": {"drug_name": "imatinib"}}
{"type": "token", "content": "Imatinib "}
{"type": "token", "content": "commonly causes..."}
{"type": "complete", "full_response": "Imatinib commonly causes..."}
```

## Medical reference

### Supported TKIs

| Drug | Brand | Food rule |
|:---|:---|:---|
| Imatinib | Gleevec | Take with food |
| Dasatinib | Sprycel | With or without food |
| Nilotinib | Tasigna | Must be taken on empty stomach |
| Bosutinib | Bosulif | Must be taken with food |
| Ponatinib | Iclusig | With or without food |
| Asciminib | Scemblix | Must be taken on empty stomach |

### Milestone thresholds

| Milestone | BCR-ABL1 | Description |
|:---|:---|:---|
| CCyR | <= 1.0% | Complete cytogenetic response |
| MMR | <= 0.1% | Major molecular response |
| MR4 | <= 0.01% | Molecular response 4 |
| MR4.5 | <= 0.0032% | Deep molecular response |

### CBC normal ranges

| Test | Range | Unit |
|:---|:---|:---|
| WBC | 4.5 -- 11.0 | K/uL |
| Platelets | 150 -- 400 | K/uL |
| Hemoglobin | 12.0 -- 17.0 | g/dL |
| RBC | 4.0 -- 5.5 | M/uL |

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
