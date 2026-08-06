from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from dotenv import load_dotenv
from api.routes import router
from api.lab_routes import router as lab_router
from api.websocket import chat_websocket
from database import init_db

logger = logging.getLogger(__name__)

load_dotenv()

# Initialize database on startup
init_db()

app = FastAPI(
    title="CML Assistant API",
    description="""
    API for CML Patient Assistant
    
    ## Features
    - Session management (CRUD)
    - Real-time chat via WebSocket
    - Tool calling for medical information
    
    ## WebSocket
    Connect to `/ws/chat` for real-time streaming responses.
    
    ### Messages
    - `{"type": "chat", "session_id": "...", "message": "..."}` - Send chat message
    - `{"type": "token", "content": "..."}` - Receive streaming token
    - `{"type": "tool_call", "tool": "...", "args": {...}}` - Tool execution
    - `{"type": "complete", "full_response": "..."}` - Response complete
    """,
    version="1.0.0"
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)
app.include_router(lab_router)

@app.get("/")
async def root():
    return {"message": "CML Assistant API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await chat_websocket(websocket)


@app.on_event("startup")
async def startup_event():
    """Pre-download embedding model and ingest PDF on server start."""
    from agent.tools.rag_search import warm_up_embedding_model, ensure_pdf_ingested
    import threading

    def _startup_work():
        try:
            ensure_pdf_ingested()
            warm_up_embedding_model()
        except Exception as e:
            logger.warning(f"Startup RAG initialization failed: {e}")

    # Run in background thread so server starts immediately
    threading.Thread(target=_startup_work, daemon=True).start()