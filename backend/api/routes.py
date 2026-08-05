from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sys
import os

# Add backend to path for database import
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import (
    get_all_sessions, 
    get_session_messages, 
    create_new_session, 
    delete_session, 
    rename_session
)

router = APIRouter(prefix="/api", tags=["sessions"])

class SessionCreate(BaseModel):
    title: str

class SessionRename(BaseModel):
    title: str

class MessageResponse(BaseModel):
    role: str
    content: str

class SessionResponse(BaseModel):
    session_id: str
    title: str
    created_at: str

@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions():
    sessions = get_all_sessions()
    return [
        SessionResponse(session_id=s[0], title=s[1], created_at=s[2])
        for s in sessions
    ]

@router.post("/sessions", response_model=SessionResponse)
async def create_session(session: SessionCreate):
    import uuid
    session_id = str(uuid.uuid4())
    create_new_session(session_id, session.title)
    return SessionResponse(session_id=session_id, title=session.title, created_at="")

@router.put("/sessions/{session_id}")
async def update_session(session_id: str, session: SessionRename):
    rename_session(session_id, session.title)
    return {"message": "Session renamed"}

@router.delete("/sessions/{session_id}")
async def delete_session_endpoint(session_id: str):
    delete_session(session_id)
    return {"message": "Session deleted"}

@router.get("/sessions/{session_id}/messages", response_model=List[MessageResponse])
async def get_messages(session_id: str):
    messages = get_session_messages(session_id)
    return [MessageResponse(role=m["role"], content=m["content"]) for m in messages]