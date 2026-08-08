from fastapi import APIRouter, HTTPException, Depends
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
    rename_session,
    update_message,
    delete_message_and_reply
)
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["sessions"])

class SessionCreate(BaseModel):
    title: str

class SessionRename(BaseModel):
    title: str

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str

class SessionResponse(BaseModel):
    session_id: str
    title: str
    created_at: str

@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(user_id: str = Depends(get_current_user)):
    sessions = get_all_sessions(user_id=user_id)
    return [
        SessionResponse(session_id=s[0], title=s[1], created_at=s[2])
        for s in sessions
    ]

@router.post("/sessions", response_model=SessionResponse)
async def create_session(session: SessionCreate, user_id: str = Depends(get_current_user)):
    import uuid
    session_id = str(uuid.uuid4())
    create_new_session(session_id, session.title, user_id=user_id)
    return SessionResponse(session_id=session_id, title=session.title, created_at="")

@router.put("/sessions/{session_id}")
async def update_session(session_id: str, session: SessionRename, user_id: str = Depends(get_current_user)):
    # Verify session belongs to user
    sessions = get_all_sessions(user_id=user_id)
    session_ids = [s[0] for s in sessions]
    if session_id not in session_ids:
        raise HTTPException(status_code=403, detail="Not authorized")
    rename_session(session_id, session.title)
    return {"message": "Session renamed"}

@router.delete("/sessions/{session_id}")
async def delete_session_endpoint(session_id: str, user_id: str = Depends(get_current_user)):
    # Verify session belongs to user
    sessions = get_all_sessions(user_id=user_id)
    session_ids = [s[0] for s in sessions]
    if session_id not in session_ids:
        raise HTTPException(status_code=403, detail="Not authorized")
    delete_session(session_id)
    return {"message": "Session deleted"}

@router.get("/sessions/{session_id}/messages", response_model=List[MessageResponse])
async def get_messages(session_id: str, user_id: str = Depends(get_current_user)):
    # Verify session belongs to user
    sessions = get_all_sessions(user_id=user_id)
    session_ids = [s[0] for s in sessions]
    if session_id not in session_ids:
        raise HTTPException(status_code=403, detail="Not authorized")
    messages = get_session_messages(session_id)
    return [MessageResponse(id=m["id"], role=m["role"], content=m["content"]) for m in messages]

class MessageUpdate(BaseModel):
    content: str

@router.put("/sessions/{session_id}/messages/{message_id}")
async def update_message_endpoint(
    session_id: str, 
    message_id: int, 
    message: MessageUpdate, 
    user_id: str = Depends(get_current_user)
):
    # Verify session belongs to user
    sessions = get_all_sessions(user_id=user_id)
    session_ids = [s[0] for s in sessions]
    if session_id not in session_ids:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated = update_message(message_id, message.content)
    if not updated:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"message": "Message updated"}

@router.delete("/sessions/{session_id}/messages/{message_id}")
async def delete_message_endpoint(
    session_id: str, 
    message_id: int, 
    user_id: str = Depends(get_current_user)
):
    # Verify session belongs to user
    sessions = get_all_sessions(user_id=user_id)
    session_ids = [s[0] for s in sessions]
    if session_id not in session_ids:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    deleted = delete_message_and_reply(message_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"message": "Message deleted"}