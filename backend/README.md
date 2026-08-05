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