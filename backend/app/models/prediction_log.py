from sqlalchemy import String, DateTime, Integer, Float, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base

class ModelPredictionLog(Base):
    __tablename__ = "model_prediction_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_version: Mapped[str] = mapped_column(String(50), index=True)
    prediction_score: Mapped[float] = mapped_column(Float)
    is_fraud_predicted: Mapped[bool] = mapped_column(Boolean)
    latency_ms: Mapped[float] = mapped_column(Float)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
