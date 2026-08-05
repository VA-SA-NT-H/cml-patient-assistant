# CML Patient Assistant (TKI Side Effect Navigator)

A web application for Chronic Myeloid Leukemia (CML) patients to navigate Tyrosine Kinase Inhibitor (TKI) side effects, track lab results, and manage their treatment journey.

## Features

### Chat Assistant
- **TKI Info Lookup:** Side effects and clinical red flags for all major TKIs (Imatinib, Dasatinib, Nilotinib, Bosutinib, Ponatinib, Asciminib).
- **Dietary Interactions:** Food rules, fasting requirements, antacid timing, and supplement exclusions.
- **Medical Guidelines Search:** RAG-based search over the official CML guidelines PDF using ChromaDB.
- **Wikipedia Fallback:** General CML/leukemia knowledge when PDF results are insufficient.
- **Streaming Responses:** Real-time token-by-token chat via WebSocket.
- **Patient Lab Data Access:** Chatbot retrieves your actual lab results to answer questions about your progress.

### Lab Tracker
- **Manual Entry:** Add lab results (BCR-ABL1, WBC, platelets, hemoglobin) via form dialog.
- **File Upload:** Import CSV or PDF lab reports with preview and validation before committing.
- **Dashboard:** Summary cards showing latest values, current TKI, and total results.
- **Trend Charts:** Logarithmic BCR-ABL1 chart and CBC trend charts using MUI X Charts.
- **Treatment Timeline:** Visual timeline of TKI history with current treatment badge.
- **Milestone Tracking:** CCyR, MMR, MR4, MR4.5 achievement cards.
- **Warning System:** Automatic alerts for rising BCR-ABL1, loss of MMR/CCyR, severe neutropenia, thrombocytopenia, anemia, and stale data.
- **Data Encryption:** Fernet encryption for lab values at rest.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 6, Vite 8, MUI 6, MUI X Charts, react-router-dom |
| Backend | Python 3.12, FastAPI, WebSocket, SQLite |
| AI | Gemini API (google-genai), ChromaDB for RAG |
| Encryption | Fernet symmetric (cryptography) |
| Containerization | Docker, Docker Compose |

---

## Project Structure

```
├── backend/
│   ├── api/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── routes.py            # Session CRUD endpoints
│   │   ├── lab_routes.py        # Lab results, treatments, upload, dashboard endpoints
│   │   ├── upload_parser.py     # CSV and PDF parsing
│   │   └── websocket.py         # WebSocket chat handler with Gemini streaming
│   ├── agent/
│   │   ├── agent.py             # Gemini client setup and tools
│   │   └── tools/               # Tool implementations
│   │       ├── tki_info.py
│   │       ├── food_rules.py
│   │       ├── rag_search.py
│   │       └── wiki_search.py
│   ├── database.py              # SQLite operations (sessions, messages, lab_results, treatments, milestones)
│   ├── encryption.py            # Fernet encrypt/decrypt for lab values
│   ├── lab_warnings.py          # Trend analysis and warning generation
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main layout with sidebar, chat, and dashboard routing
│   │   ├── main.tsx             # Entry point with ThemeProvider and BrowserRouter
│   │   ├── pages/
│   │   │   └── Dashboard.tsx    # Lab tracker dashboard
│   │   ├── components/
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── LabResultsChart.tsx
│   │   │   ├── CBCChart.tsx
│   │   │   ├── TreatmentTimeline.tsx
│   │   │   ├── MilestoneCards.tsx
│   │   │   ├── DataEntryDialog.tsx
│   │   │   ├── FileUploadDialog.tsx
│   │   │   └── WarningBanner.tsx
│   │   └── theme/
│   │       └── ThemeProvider.tsx # Dark/light mode with MUI theme
│   ├── package.json
│   └── Dockerfile
├── cml_guide.pdf                 # Medical guidelines for RAG
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Setup Instructions

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Frontend

```bash
cd frontend
npm install
```

### 3. Configure Environment

Copy `.env.example` to `.env` in the project root and fill in your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemma-4-31b-it
ENCRYPTION_KEY=your-fernet-key-here
```

Generate a Fernet key with:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 4. Ingest Guidelines PDF (one-time)

```bash
cd backend
python -c "from agent.tools.rag_search import *; # triggers ChromaDB indexing"
```

---

## Running Locally

### Backend
```bash
cd backend
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```
API docs available at `http://localhost:8000/docs`.

### Frontend
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Running with Docker

```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

---

## Medical Disclaimer

This application is for informational and tracking support only. It does not replace professional medical diagnosis, advice, or treatment. Always consult your hematologist or oncologist before making any changes to your treatment plan.
