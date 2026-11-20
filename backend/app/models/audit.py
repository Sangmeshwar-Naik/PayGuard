from sqlalchemy import String, DateTime, Integer, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    transaction_id: Mapped[int] = mapped_column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), index=True)
    action: Mapped[str] = mapped_column(String(60), index=True)  # CREATED, ASSIGNED, STATUS_CHANGE, NOTE_ADDED, RULE_FLAGGED
    actor: Mapped[str] = mapped_column(String(80), default="System Engine")
    details: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
