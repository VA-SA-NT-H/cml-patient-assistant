# Multi-stage build for Railway
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS backend
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 --retries 10 -r requirements.txt || \
    pip install --no-cache-dir --default-timeout=1000 --retries 10 -r requirements.txt || \
    pip install --no-cache-dir --default-timeout=1000 --retries 10 -r requirements.txt
COPY backend/ ./
COPY cml_guide.pdf ./
COPY --from=frontend-build /app/frontend/dist ./static

EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
