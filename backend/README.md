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

### Sessions
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/{id}` - Rename session
- `DELETE /api/sessions/{id}` - Delete session
- `GET /api/sessions/{id}/messages` - Get messages

### Lab Results
- `GET /api/lab-results` - List lab results (optional `?test_type=` filter)
- `POST /api/lab-results` - Create lab result
- `PUT /api/lab-results/{id}` - Update lab result
- `DELETE /api/lab-results/{id}` - Delete lab result
- `POST /api/lab-results/bulk` - Bulk create lab results

### Treatments
- `GET /api/treatments` - List treatments
- `POST /api/treatments` - Create treatment
- `PUT /api/treatments/{id}` - Update treatment
- `DELETE /api/treatments/{id}` - Delete treatment

### Upload
- `POST /api/upload-csv` - Parse CSV file
- `POST /api/upload-pdf` - Parse PDF file

### Dashboard
- `GET /api/dashboard` - Dashboard summary with latest values, warnings, milestones
- `GET /api/milestones` - List milestones

### WebSocket
- `WS /ws/chat` - Real-time chat streaming

## Docker

```bash
docker-compose up
```
