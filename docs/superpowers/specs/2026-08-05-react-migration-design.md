# React Migration Design

**Date:** 2026-08-05
**Status:** Draft
**Scope:** Migrate CML Patient Assistant from Streamlit to React frontend

---

## Overview

Migrate the CML Patient Assistant from a Streamlit monolith to a modern React frontend with a FastAPI backend. This provides full control over UI, better interactivity, real-time streaming, and mobile responsiveness.

## Current Architecture

- **Frontend:** Streamlit (Python)
- **Backend:** Python with Gemini API, SQLite database
- **Features:** Chat interface, session management, theme toggling, temporary sessions, tool calling visualization

## Target Architecture

- **Frontend:** React + TypeScript + Vite + Material UI
- **Backend:** FastAPI (Python) with REST + WebSocket
- **Deployment:** Docker Compose

---

## Project Structure

```
cml-assistant/
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI app
│   │   ├── routes.py        # REST endpoints
│   │   └── websocket.py     # WebSocket handler
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── agent.py         # Gemini agent (existing)
│   │   └── tools.py         # Tool functions (existing)
│   ├── database.py          # SQLite (existing)
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useTheme.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
└── README.md
```

---

## Backend API Design

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sessions | List all sessions |
| POST | /api/sessions | Create new session |
| PUT | /api/sessions/{id} | Rename session |
| DELETE | /api/sessions/{id} | Delete session |
| GET | /api/sessions/{id}/messages | Get messages for a session |
| POST | /api/chat | Send message (returns streaming response) |

### WebSocket Endpoint

| Endpoint | Description |
|----------|-------------|
| WS /ws/chat | Real-time streaming chat |

### WebSocket Messages

**Client → Server:**
```json
{ "type": "chat", "session_id": "...", "message": "..." }
```

**Server → Client:**
```json
{ "type": "token", "content": "partial text" }
{ "type": "tool_call", "tool": "lookup_tki_info", "args": {...} }
{ "type": "tool_result", "tool": "lookup_tki_info", "result": "..." }
{ "type": "complete", "full_response": "..." }
```

---

## Frontend Components

### Key Components

1. **App.tsx** — Main layout with sidebar + chat area
2. **Sidebar.tsx** — Session list, new chat button, theme toggle
3. **ChatMessage.tsx** — Individual message display (user/assistant)
4. **ChatInput.tsx** — Message input with send button
5. **ThemeToggle.tsx** — Dark/light mode toggle
6. **ToolCallIndicator.tsx** — Shows when AI is using tools

### Tech Stack

- React 18 with TypeScript
- Vite for build
- Material UI for components
- CSS Variables for theming (reuse existing design)

### State Management

- `useState` for local component state
- `useContext` for theme
- Custom hooks for WebSocket and API calls

---

## Data Flow

### Chat Message Flow

1. User types message in ChatInput
2. Frontend sends WebSocket message: `{ type: "chat", session_id, message }`
3. Backend receives message, calls Gemini API
4. Backend streams tokens back via WebSocket
5. Frontend displays tokens in real-time
6. When complete, backend sends `{ type: "complete" }`
7. Frontend saves message to local storage

### Session Management Flow

1. Sidebar loads sessions from `GET /api/sessions`
2. User clicks "New Chat" → `POST /api/sessions`
3. User clicks session → `GET /api/sessions/{id}/messages`
4. User renames → `PUT /api/sessions/{id}`
5. User deletes → `DELETE /api/sessions/{id}`

### Theme Flow

1. Theme preference stored in browser's localStorage
2. On app mount, read theme from localStorage (default: dark)
3. CSS variables updated based on theme
4. ThemeToggle switches between dark/light and updates localStorage

---

## Deployment

### Docker Compose Setup

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

### Development Workflow

1. `docker-compose up` — Start both services
2. Backend: `http://localhost:8000` (FastAPI docs at `/docs`)
3. Frontend: `http://localhost:3000` (Vite dev server)

### Production Build

1. Build frontend: `npm run build`
2. Serve from FastAPI static files
3. Single container deployment

---

## Migration Strategy

### Phase 1: Backend API
1. Create FastAPI app structure
2. Wrap existing database.py with REST endpoints
3. Add WebSocket handler for streaming
4. Test API endpoints

### Phase 2: React Frontend
1. Initialize React + Vite project
2. Set up Material UI and theming
3. Build core components (Sidebar, ChatMessage, ChatInput)
4. Implement WebSocket connection
5. Add session management

### Phase 3: Integration & Polish
1. Connect frontend to backend
2. Test streaming chat
3. Add tool call visualization
4. Mobile responsiveness
5. Performance optimization

---

## Success Criteria

- [ ] React frontend matches current Streamlit UI functionality
- [ ] Real-time streaming chat works via WebSocket
- [ ] Session management (create, rename, delete) works
- [ ] Theme toggling (dark/light) works
- [ ] Temporary session mode works
- [ ] Tool call visualization works
- [ ] Mobile responsive design
- [ ] Docker deployment works
- [ ] Performance equal or better than Streamlit