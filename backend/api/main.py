from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from api.routes import router
from api.websocket import chat_websocket

load_dotenv()

app = FastAPI(
    title="CML Assistant API",
    description="API for CML Patient Assistant",
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

@app.get("/")
async def root():
    return {"message": "CML Assistant API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await chat_websocket(websocket)