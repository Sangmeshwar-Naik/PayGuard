from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import Base, engine
from app.models import Transaction, AuditLog, ModelPredictionLog
from app.api import router

# Ensure all database tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PayGuard API",
    version="1.0.0",
    description="High-Throughput Financial Fraud Detection & Risk Arbitration Engine",
)

# Robust CORS configuration for development and production containers
origins = [
    settings.frontend_origin,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.frontend_origin == "*" else origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "payguard-risk-engine",
        "version": "1.0.0",
        "engine": "FastAPI + ML/Rules Arbiter",
    }
