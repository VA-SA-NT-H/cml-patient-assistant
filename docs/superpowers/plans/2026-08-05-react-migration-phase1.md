# React Migration - Phase 1: Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a FastAPI backend that wraps the existing Python agent and database, exposing REST and WebSocket endpoints.

**Architecture:** FastAPI app with REST endpoints for session management and WebSocket for real-time chat streaming. Reuses existing database.py and agent/ code.

**Tech Stack:** Python 3.x, FastAPI, WebSocket, SQLite, Google Gemini API

## Global Constraints

- Python 3.x, FastAPI 0.100+
- Existing SQLite database (cml_chat_history.db)
- Existing Gemini agent code (agent/agent.py, agent/tools.py)
- GEMINI_API_KEY environment variable required
- WebSocket for streaming chat responses

---

## Task 1: Create Backend Project Structure

**Files:**
- Create: `backend/` directory
- Create: `backend/__init__.py`
- Create: `backend/requirements.txt`

**Interfaces:**
- Consumes: None
- Produces: Backend project structure

- [ ] **Step 1: Create backend directory**

```bash
mkdir -p backend/api
mkdir -p backend/agent
```

- [ ] **Step 2: Create __init__.py files**

```bash
touch backend/__init__.py
touch backend/api/__init__.py
touch backend/agent/__init__.py
```

- [ ] **Step 3: Create requirements.txt**

```bash
cat > backend/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
websockets==12.0
python-dotenv==1.0.0
google-genai==2.16.0
tenacity==9.1.4
chromadb==1.5.9
PyPDF2==3.0.1
wikipedia==1.4.0
EOF
```

- [ ] **Step 4: Copy existing code**

```bash
cp database.py backend/
cp -r agent/* backend/agent/
```

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat: create backend project structure"
```

---

## Task 2: Create FastAPI Main App

**Files:**
- Create: `backend/api/main.py`

**Interfaces:**
- Consumes: backend/requirements.txt
- Produces: FastAPI app instance

- [ ] **Step 1: Create main.py with FastAPI app**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

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

@app.get("/")
async def root():
    return {"message": "CML Assistant API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

- [ ] **Step 2: Test the app**

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload
```

Expected: App starts on http://localhost:8000

- [ ] **Step 3: Verify endpoints**

```bash
curl http://localhost:8000/
curl http://localhost:8000/health
curl http://localhost:8000/docs
```

Expected: JSON responses, Swagger docs at /docs

- [ ] **Step 4: Commit**

```bash
git add backend/api/main.py
git commit -m "feat: create FastAPI main app"
```

---

## Task 3: Create Session REST Endpoints

**Files:**
- Create: `backend/api/routes.py`
- Modify: `backend/api/main.py`

**Interfaces:**
- Consumes: backend/database.py
- Produces: REST endpoints for session management

- [ ] **Step 1: Create routes.py with session endpoints**

```python
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
```

- [ ] **Step 2: Add routes to main.py**

```python
from api.routes import router

app.include_router(router)
```

- [ ] **Step 3: Test endpoints**

```bash
curl http://localhost:8000/api/sessions
curl -X POST http://localhost:8000/api/sessions -H "Content-Type: application/json" -d '{"title": "Test Session"}'
curl http://localhost:8000/api/sessions/{session_id}/messages
```

- [ ] **Step 4: Commit**

```bash
git add backend/api/routes.py backend/api/main.py
git commit -m "feat: add session REST endpoints"
```

---

## Task 4: Create WebSocket Handler

**Files:**
- Create: `backend/api/websocket.py`
- Modify: `backend/api/main.py`

**Interfaces:**
- Consumes: backend/agent/agent.py
- Produces: WebSocket endpoint for streaming chat

- [ ] **Step 1: Create websocket.py with chat handler**

```python
from fastapi import WebSocket, WebSocketDisconnect
import json
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from agent.agent import client, model_name
from agent.tools import lookup_tki_info, lookup_food_interactions, search_medical_guidelines, search_wikipedia
from google.genai import types

tools_map = {
    "lookup_tki_info": lookup_tki_info,
    "lookup_food_interactions": lookup_food_interactions,
    "search_medical_guidelines": search_medical_guidelines,
    "search_wikipedia": search_wikipedia
}

tools = [lookup_tki_info, lookup_food_interactions, search_medical_guidelines, search_wikipedia]

SYSTEM_INSTRUCTION = """
CRITICAL ROLEPLAY RULE: You are a compassionate medical assistant and lifestyle companion for Chronic Myeloid Leukemia (CML) patients. 
Your primary directive is to relate EVERY user input back to CML, Tyrosine Kinase Inhibitor (TKI) treatments (like imatinib, dasatinib, nilotinib, bosutinib, ponatinib, or asciminib), or patient wellness.

- If the user asks about a medical or treatment topic, use your tools:
  - Side effects/red flags (lookup_tki_info)
  - Dietary/food rules (lookup_food_interactions)
  - Official CML guidelines PDF (search_medical_guidelines)
  - General CML/leukemia knowledge via Wikipedia (search_wikipedia - ONLY if PDF fails)
- If the user asks about a seemingly unrelated topic (e.g., travel, exercise, stress, or general diet), DO NOT refuse. Instead, creatively find a clinical, practical, or lifestyle connection to living with CML. 
- For example: If they ask about traveling, relate it to maintaining strict daily TKI pill schedules across time zones or managing sun protection. If they ask about general stress, relate it to the emotional weight of living with a chronic condition or managing fatigue.
- Always gently guide the conversation back to supporting a CML patient safely, warmly, and empathetically.

FORMATTING RULES:
- Use Markdown bullet points to present the information clearly.
- Explicitly cite your exact source (e.g., "Source: Wikipedia", "Source: Guidelines PDF", "Source: TKI Side Effects Database", or "Source: Food Rules Database") at the very end of your response.
"""

async def chat_websocket(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "chat":
                session_id = message_data.get("session_id")
                user_message = message_data.get("message")
                
                # Build conversation history (simplified for now)
                contents = [user_message]
                
                # Process with Gemini
                config = types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    tools=tools,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
                )
                
                # Send thinking status
                await websocket.send_json({"type": "status", "content": "Thinking..."})
                
                # First model call
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config
                )
                
                # Check for tool calls
                if response.function_calls:
                    for function_call in response.function_calls:
                        name = function_call.name
                        args = function_call.args
                        
                        # Send tool call status
                        await websocket.send_json({
                            "type": "tool_call",
                            "tool": name,
                            "args": args
                        })
                        
                        # Execute tool
                        tool_func = tools_map.get(name)
                        if tool_func:
                            tool_result = tool_func(**args)
                            await websocket.send_json({
                                "type": "tool_result",
                                "tool": name,
                                "result": str(tool_result)[:500]  # Limit result size
                            })
                            
                            # Add to conversation
                            contents.append(response.candidates[0].content)
                            contents.append(types.Content(
                                role="tool",
                                parts=[types.Part.from_function_response(
                                    name=name,
                                    response={"result": tool_result}
                                )]
                            ))
                
                # Stream final response
                await websocket.send_json({"type": "status", "content": "Generating response..."})
                
                response_stream = client.models.generate_content_stream(
                    model=model_name,
                    contents=contents,
                    config=config
                )
                
                full_response = ""
                for chunk in response_stream:
                    if chunk.text:
                        await websocket.send_json({
                            "type": "token",
                            "content": chunk.text
                        })
                        full_response += chunk.text
                
                # Send completion
                await websocket.send_json({
                    "type": "complete",
                    "full_response": full_response
                })
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })
```

- [ ] **Step 2: Add WebSocket route to main.py**

```python
from api.websocket import chat_websocket

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await chat_websocket(websocket)
```

- [ ] **Step 3: Test WebSocket (manual test with wscat)**

```bash
npm install -g wscat
wscat -c ws://localhost:8000/ws/chat
# Send: {"type": "chat", "session_id": "test", "message": "What are side effects of Imatinib?"}
```

- [ ] **Step 4: Commit**

```bash
git add backend/api/websocket.py backend/api/main.py
git commit -m "feat: add WebSocket chat handler"
```

---

## Task 5: Create Docker Compose Setup

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `.env.example`

**Interfaces:**
- Consumes: backend/
- Produces: Docker deployment configuration

- [ ] **Step 1: Create backend/Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Create docker-compose.yml**

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - ./cml_chat_history.db:/app/cml_chat_history.db
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GEMINI_MODEL=${GEMINI_MODEL}
    env_file:
      - .env
```

- [ ] **Step 3: Create .env.example**

```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=your_model_name_here
```

- [ ] **Step 4: Test Docker build**

```bash
docker-compose build
docker-compose up
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml backend/Dockerfile .env.example
git commit -m "feat: add Docker Compose setup"
```

---

## Task 6: Add API Documentation

**Files:**
- Modify: `backend/api/main.py`
- Create: `backend/README.md`

**Interfaces:**
- Consumes: All previous tasks
- Produces: API documentation

- [ ] **Step 1: Update main.py with detailed docs**

```python
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
```

- [ ] **Step 2: Create backend/README.md**

```markdown
# CML Assistant Backend

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create .env file:
   ```bash
   cp ../.env.example .env
   # Edit .env with your API keys
   ```

3. Run the server:
   ```bash
   uvicorn api.main:app --reload
   ```

4. Open API docs:
   http://localhost:8000/docs

## Endpoints

### REST
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/{id}` - Rename session
- `DELETE /api/sessions/{id}` - Delete session
- `GET /api/sessions/{id}/messages` - Get messages

### WebSocket
- `WS /ws/chat` - Real-time chat streaming

## Docker

```bash
docker-compose up
```
```

- [ ] **Step 3: Commit**

```bash
git add backend/api/main.py backend/README.md
git commit -m "docs: add API documentation"
```

---

## Final Verification

- [ ] **Step 1: Run all tests**

```bash
cd backend
python -m pytest
```

- [ ] **Step 2: Manual testing checklist**

1. Backend starts without errors
2. REST endpoints return correct data
3. WebSocket connects and streams responses
4. Tool calls work correctly
5. Docker builds and runs

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete Phase 1 - Backend API"
```