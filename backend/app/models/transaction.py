from sqlalchemy import String, DateTime, Float, Boolean, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base

class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    card_token: Mapped[str] = mapped_column(String(40), index=True)
    merchant: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(80))
    amount: Mapped[float] = mapped_column(Float)
    country: Mapped[str] = mapped_column(String(3), default="USA")
    channel: Mapped[str] = mapped_column(String(30), default="online")
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_level: Mapped[str] = mapped_column(String(20), default="low")
    status: Mapped[str] = mapped_column(String(30), default="approved")
    reason: Mapped[str] = mapped_column(Text, default="")
    is_demo_fraud: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Advanced Fraud & Case Management fields
    assigned_to: Mapped[str | None] = mapped_column(String(80), nullable=True, default=None)
    assigned_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    investigation_notes: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    resolved_by: Mapped[str | None] = mapped_column(String(80), nullable=True, default=None)
    resolved_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    risk_factors: Mapped[str | None] = mapped_column(Text, nullable=True, default="[]")
    model_version: Mapped[str | None] = mapped_column(String(50), nullable=True, default="v1.0.0-xgb")
    model_score: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.0)
    rule_score: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.0)
    device_id: Mapped[str | None] = mapped_column(String(64), nullable=True, default=None)
    client_ip: Mapped[str | None] = mapped_column(String(45), nullable=True, default="192.168.1.1")
    payment_method: Mapped[str | None] = mapped_column(String(40), nullable=True, default="credit_card")
    
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
