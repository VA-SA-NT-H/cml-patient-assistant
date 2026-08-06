# CML Patient Assistant

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat-square&logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google" alt="Gemini AI">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python" alt="Python">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
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
| **TKI Information** | Detailed side effects and clinical red flags for all major TKIs |
| **Drug Interactions** | Food rules, fasting requirements, antacid timing, and supplement exclusions |
| **RAG-Powered Search** | Intelligent search over official CML guidelines using ChromaDB |
| **Lab Data Access** | Chat retrieves your actual lab results to answer questions about your progress |
| **Streaming Responses** | Real-time token-by-token responses via WebSocket |

### Lab Tracker Dashboard

| Feature | Description |
|---------|-------------|
| **Manual Entry** | Add lab results (BCR-ABL1, WBC, platelets, hemoglobin) via form |
| **File Upload** | Import CSV, PDF, or image lab reports with preview and validation |
| **Trend Charts** | Logarithmic BCR-ABL1 chart and CBC trend visualization |
| **Treatment Timeline** | Visual history of TKI medications with current treatment badge |
| **Milestone Tracking** | CCyR, MMR, MR4, MR4.5 achievement cards |
| **Smart Warnings** | Automatic alerts for rising BCR-ABL1, severe cytopenias, and stale data |

### Security & Multi-User

| Feature | Description |
|---------|-------------|
| **Google OAuth** | Secure authentication via Google Sign-In |
| **Data Isolation** | Complete user-level data separation |
| **Encryption** | Fernet symmetric encryption for lab values at rest |
| **JWT Tokens** | Secure API and WebSocket authentication |

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│  React 19 • TypeScript • Vite • MUI 6 • MUI X Charts       │
├─────────────────────────────────────────────────────────────┤
│                        Backend                              │
│  Python 3.12 • FastAPI • WebSocket • SQLite                 │
├─────────────────────────────────────────────────────────────┤
│                          AI Layer                           │
│  Gemini API • ChromaDB (RAG) • RapidOCR                     │
├─────────────────────────────────────────────────────────────┤
│                      Infrastructure                         │
│  Docker • Railway • Google OAuth 2.0                         │
└─────────────────────────────────────────────────────────────┘
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
| `FRONTEND_URL` | Your app URL | `http://localhost:3000` for local |

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

## Docker Deployment

### Local Docker

```bash
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

### Railway Deployment

See [Railway Deployment Guide](#railway-deployment) below.

---

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sessions` | List all chat sessions |
| `POST` | `/api/sessions` | Create new session |
| `GET` | `/api/sessions/{id}/messages` | Get session messages |
| `DELETE` | `/api/sessions/{id}` | Delete session |
| `GET` | `/api/lab-results` | List lab results |
| `POST` | `/api/lab-results` | Add lab result |
| `PUT` | `/api/lab-results/{id}` | Update lab result |
| `DELETE` | `/api/lab-results/{id}` | Delete lab result |
| `POST` | `/api/lab-results/bulk` | Bulk import results |
| `GET` | `/api/treatments` | List treatments |
| `POST` | `/api/treatments` | Add treatment |
| `GET` | `/api/dashboard` | Get dashboard data |
| `DELETE` | `/api/reset` | Reset all data |

### WebSocket

Connect to `ws://localhost:8000/ws/chat?token=<jwt>`

**Send:**
```json
{
  "type": "chat",
  "session_id": "abc123",
  "message": "What are the side effects of Imatinib?"
}
```

**Receive:**
```json
{"type": "token", "content": "Imatinib "}
{"type": "token", "content": "commonly causes..."}
{"type": "tool_call", "tool": "tki_info", "args": {"drug_name": "Imatinib"}}
{"type": "complete", "full_response": "Imatinib commonly causes..."}
```

### Authentication

```bash
# Get JWT token
GET /auth/google

# Google callback
GET /auth/google/callback?code=...

# Get current user
GET /auth/me
Authorization: Bearer <token>
```

---

## Project Structure

```
cml-patient-assistant/
├── backend/
│   ├── api/
│   │   ├── main.py              # FastAPI app & middleware
│   │   ├── routes.py            # Session CRUD endpoints
│   │   ├── lab_routes.py        # Lab results, treatments, dashboard
│   │   ├── auth_routes.py       # Google OAuth endpoints
│   │   ├── upload_parser.py     # CSV, PDF, image parsing
│   │   └── websocket.py         # WebSocket chat handler
│   ├── agent/
│   │   ├── agent.py             # Gemini client & tool registration
│   │   └── tools/
│   │       ├── tki_info.py      # TKI side effects lookup
│   │       ├── food_rules.py    # Dietary interactions
│   │       ├── rag_search.py    # ChromaDB vector search
│   │       └── wiki_search.py   # Wikipedia fallback
│   ├── auth.py                  # JWT & OAuth utilities
│   ├── database.py              # SQLite operations
│   ├── encryption.py            # Fernet encryption
│   ├── lab_warnings.py          # Trend analysis & alerts
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main layout
│   │   ├── api.ts               # API client
│   │   ├── context/
│   │   │   └── AuthContext.tsx   # Authentication state
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx    # Google OAuth login
│   │   │   └── Dashboard.tsx    # Lab tracker dashboard
│   │   ├── components/
│   │   │   ├── ChatMessage.tsx  # Message bubbles
│   │   │   ├── ChatInput.tsx    # Message input
│   │   │   ├── Sidebar.tsx      # Session list
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── LabResultsChart.tsx
│   │   │   ├── CBCResults.tsx
│   │   │   ├── TreatmentTimeline.tsx
│   │   │   ├── MilestoneCards.tsx
│   │   │   ├── DataEntryDialog.tsx
│   │   │   ├── FileUploadDialog.tsx
│   │   │   └── WarningBanner.tsx
│   │   └── theme/
│   │       └── ThemeProvider.tsx
│   └── package.json
├── cml_guide.pdf                # Medical guidelines for RAG
├── docker-compose.yml
├── Dockerfile                   # Multi-stage production build
├── railway.json                 # Railway deployment config
├── .env.example
└── README.md
```

---

## Railway Deployment

### Step 1: Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable Google+ API
3. Go to **APIs & Services > Credentials**
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URI: `https://your-app.up.railway.app/auth/google/callback`

### Step 2: Deploy to Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) and create a new project
3. **Deploy from GitHub repo** → select your repository
4. Railway auto-detects the `Dockerfile` at root
5. Go to **Settings > Networking** → Generate Domain → port `8000`

### Step 3: Set Environment Variables

In Railway dashboard → **Variables**:

```
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-2.0-flash
JWT_SECRET=generate_random_string
GOOGLE_CLIENT_ID=from_google_console
GOOGLE_CLIENT_SECRET=from_google_console
FRONTEND_URL=https://your-app.up.railway.app
```

### Step 4: Update Google OAuth

1. Copy your Railway domain
2. Update redirect URI in Google Cloud Console to:
   ```
   https://your-app.up.railway.app/auth/google/callback
   ```
3. Redeploy the service

---

## Development

### Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

### Code Style

- **Backend**: Follow PEP 8
- **Frontend**: ESLint + Prettier (configured in `package.json`)

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
- [MUI](https://mui.com/) for Material-UI components
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- CML medical guidelines and research papers

---

<p align="center">
  Built with care for the CML community
</p>
