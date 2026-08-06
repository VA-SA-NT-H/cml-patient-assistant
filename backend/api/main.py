from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.sessions import SessionMiddleware
import os
import logging
from dotenv import load_dotenv
from api.routes import router
from api.lab_routes import router as lab_router
from api.auth_routes import router as auth_router
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

# Session middleware for OAuth
app.add_middleware(SessionMiddleware, secret_key=os.getenv("JWT_SECRET", "dev-secret"))

# CORS for React frontend
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    FRONTEND_URL,
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)
app.include_router(lab_router)
app.include_router(auth_router)

# Serve frontend static files
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/{full_path:path}")
async def serve_frontend(request: Request, full_path: str):
    """Serve frontend for all non-API routes."""
    # API routes are handled by the routers above
    if full_path.startswith("api/") or full_path.startswith("ws/") or full_path.startswith("auth/"):
        return {"detail": "Not found"}
    
    # Try to serve the static file
    file_path = os.path.join(STATIC_DIR, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # Default: serve index.html for SPA routing
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return {"message": "CML Assistant API"}

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    # Validate token
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return
    
    from auth import verify_jwt_token
    payload = verify_jwt_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    user_id = payload.get("sub")
    await chat_websocket(websocket, user_id)


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