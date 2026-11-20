from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class TransactionIn(BaseModel):
    card_token: str = Field(min_length=3, max_length=40)
    merchant: str = Field(min_length=2, max_length=120)
    category: str = "general"
    amount: float = Field(gt=0, le=1_000_000)
    country: str = "USA"
    channel: str = "online"
    payment_method: str = "credit_card"
    client_ip: Optional[str] = "192.168.1.1"
    device_id: Optional[str] = None


class TransactionOut(BaseModel):
    id: int
    external_id: str
    card_token: str
    merchant: str
    category: str
    amount: float
    country: str
    channel: str
    risk_score: float
    risk_level: str
    status: str
    reason: str
    created_at: Optional[str] = None

    # Advanced Case Management & ML Metadata
    assigned_to: Optional[str] = None
    assigned_at: Optional[str] = None
    investigation_notes: Optional[str] = ""
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    risk_factors: List[str] = []
    model_version: Optional[str] = None
    model_score: Optional[float] = None
    rule_score: Optional[float] = None
    device_id: Optional[str] = None
    client_ip: Optional[str] = None
    payment_method: Optional[str] = "credit_card"


class PaginatedTransactionsOut(BaseModel):
    items: List[TransactionOut]
    total: int
    page: int
    page_size: int
    total_pages: int
    summary: Dict[str, Any]


class AuditLogOut(BaseModel):
    id: int
    transaction_id: int
    action: str
    actor: str
    details: str
    created_at: str


class AssignPayload(BaseModel):
    investigator: str = Field(min_length=2, max_length=80)
    actor: Optional[str] = "Security Supervisor"


class StatusUpdatePayload(BaseModel):
    status: str
    notes: Optional[str] = ""
    actor: Optional[str] = "Security Operator"


class NotePayload(BaseModel):
    note: str = Field(min_length=1, max_length=2000)
    actor: Optional[str] = "Security Operator"


class ModelSelectionPayload(BaseModel):
    version: str = Field(min_length=3, max_length=50)
