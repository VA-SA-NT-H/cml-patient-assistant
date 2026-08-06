# CML Patient Assistant: TKI Side Effect Navigator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.12](https://img.shields.io/badge/Python-3.12-green.svg)](https://www.python.org/)
[![React: 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![FastAPI: 0.111+](https://img.shields.io/badge/FastAPI-0.111%2B-teal.svg)](https://fastapi.tiangolo.com/)
[![Gemini: Pro](https://img.shields.io/badge/Gemini-Pro-orange.svg)](https://deepmind.google/technologies/gemini/)

An empathetic, intelligent web application designed for **Chronic Myeloid Leukemia (CML)** patients to safely navigate Tyrosine Kinase Inhibitor (TKI) side effects, track lab trends (BCR-ABL1 and CBC metrics), and manage their treatment journey securely.

---

## Key Features

### Empathetic AI Chat Assistant
*   **TKI Reference Engine:** Instant lookup of side effects and critical clinical "red flags" for all major TKIs (Imatinib, Dasatinib, Nilotinib, Bosutinib, Ponatinib, Asciminib).
*   **Dietary & Food Rules:** Quick checks for fasting requirements, antacid scheduling, and food/supplement interactions.
*   **RAG-Powered Guidelines:** Interactive RAG search over official medical guidelines using **ChromaDB**.
*   **Contextual Bridging:** Warm, lifestyle-focused conversations that creatively bridge general topics (like stress or travel) back to practical CML care.
*   **Streaming Responses:** Real-time, token-by-token message streaming via WebSockets.
*   **Lab Integration:** The chatbot securely references your recorded lab values to answer questions about your progress.

### Lab Tracker & Milestone Dashboard
*   **Flexible Data Entry:** Manually record results or upload CSV/PDF lab reports with validation previews.
*   **Trend Visualization:** Interactive logarithmic charts for BCR-ABL1 ratio trends and linear charts for CBC metrics (WBC, Platelets, Hemoglobin) built with MUI X Charts.
*   **Treatment Timeline:** Visual history of TKI treatment shifts showing current and past drugs.
*   **Milestone Cards:** Automatic achievement tracking for major response milestones: CCyR, MMR, MR4, and MR4.5.
*   **Safety Warning System:** Visual alerts for loss of response, rising BCR-ABL1 ratios, severe cytopenias (neutropenia, thrombocytopenia, anemia), or outdated lab data.
*   **Symmetric Encryption:** Fernet cryptography keeps all patient lab results encrypted at rest.

---

## Tech Stack

| Component | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript 6, Vite 8, Material UI (MUI) 6, MUI X Charts, React Router |
| **Backend** | Python 3.12, FastAPI, WebSockets, SQLite |
| **AI / RAG** | Gemini API (`google-genai`), ChromaDB Vector Store |
| **Security** | Fernet Symmetric Encryption (`cryptography` library) |
| **Deployment** | Docker, Docker Compose |

---

## Project Structure

```
├── backend/
│   ├── api/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── routes.py            # Session CRUD API endpoints
│   │   ├── lab_routes.py        # Lab records, timeline, and dashboard metrics
│   │   ├── upload_parser.py     # Parser for CSV/PDF lab report imports
│   │   └── websocket.py         # WebSocket chat handler with streaming Gemini integration
│   ├── agent/
│   │   ├── agent.py             # Gemini API client initialization & tools registry
│   │   └── tools/               # Agent tool executors
│   │       ├── tki_info.py      # Drug side effects registry
│   │       ├── food_rules.py    # Food-drug interaction lookup
│   │       ├── rag_search.py    # Guidelines document indexer & query engine
│   │       └── wiki_search.py   # Fallback query runner
│   ├── database.py              # SQLite schemas and database operations
│   ├── encryption.py            # Fernet encrypt/decrypt helpers
│   ├── lab_warnings.py          # Trend analysis and safety warning engine
│   ├── requirements.txt         # Backend Python dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main routing & application wrapper
│   │   ├── main.tsx             # DOM entry point
│   │   ├── pages/
│   │   │   └── Dashboard.tsx    # Lab tracking dashboard & visualization page
│   │   ├── components/          # Reusable UI widgets (charts, sidebar, dialogs)
│   │   └── theme/               # Dark & Light MUI configuration provider
│   ├── package.json
│   └── Dockerfile
├── cml_guide.pdf                 # Reference medical guide for RAG ingestion
├── docker-compose.yml            # Multi-container orchestrator
├── .env.example
└── README.md
```

---

## Setup & Installation

### 1. Configure the Environment
Create a `.env` file in the root directory by copying the example template:
```bash
cp .env.example .env
```
Provide your API keys and configuration:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemma-4-31b-it
ENCRYPTION_KEY=your-fernet-key-here
```
> [!TIP]
> Generate a secure Fernet encryption key using this command:
> ```bash
> python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
> ```

### 2. Run with Docker (Recommended)
Launch the entire stack (Frontend, Backend API, and Database) with a single command:
```bash
docker-compose up --build
```
*   **Web App Frontend:** [http://localhost:3000](http://localhost:3000)
*   **Backend API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Manual Local Development

If you prefer to run the components independently:

### 1. Ingest the Guidelines PDF
Ingest the CML guidelines document into the vector database (run once):
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -c "from agent.tools.rag_search import index_pdf_if_needed; index_pdf_if_needed()"
```

### 2. Start the Backend API
```bash
cd backend
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Start the Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Medical Disclaimer

> [!WARNING]
> This application is strictly for informational, educational, and tracking support. It **does not** replace professional medical diagnosis, advice, or treatment. Always consult your hematologist or oncologist before making any changes to your treatment plan or interpreting lab results.
