from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from api.routes import router

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