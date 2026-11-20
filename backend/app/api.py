import json
from datetime import datetime, timezone
from random import choice, uniform, randint
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import desc, asc, func
from sqlalchemy.orm import Session

from app.core.websocket import ws_manager
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.transaction import Transaction
from app.schemas import (
    TransactionIn,
    AssignPayload,
    StatusUpdatePayload,
    NotePayload,
    ModelSelectionPayload,
)
from app.services.risk import score_transaction
from app.ml.service import ml_service

router = APIRouter()


def serialize(t: Transaction) -> dict:
    risk_factors = []
    if t.risk_factors:
        try:
            risk_factors = json.loads(t.risk_factors)
        except Exception:
            risk_factors = [t.risk_factors]

    return {
        "id": t.id,
        "external_id": t.external_id,
        "card_token": t.card_token,
        "merchant": t.merchant,
        "category": t.category,
        "amount": t.amount,
        "country": t.country,
        "channel": t.channel,
        "risk_score": round(t.risk_score, 1),
        "risk_level": t.risk_level,
        "status": t.status,
        "reason": t.reason,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "assigned_to": t.assigned_to,
        "assigned_at": t.assigned_at.isoformat() if t.assigned_at else None,
        "investigation_notes": t.investigation_notes or "",
        "resolved_by": t.resolved_by,
        "resolved_at": t.resolved_at.isoformat() if t.resolved_at else None,
        "risk_factors": risk_factors,
        "model_version": t.model_version,
        "model_score": round(t.model_score, 1) if t.model_score is not None else None,
        "rule_score": round(t.rule_score, 1) if t.rule_score is not None else None,
        "device_id": t.device_id,
        "client_ip": t.client_ip,
        "payment_method": t.payment_method or "credit_card",
    }


def serialize_audit(a: AuditLog) -> dict:
    return {
        "id": a.id,
        "transaction_id": a.transaction_id,
        "action": a.action,
        "actor": a.actor,
        "details": a.details,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


# ==========================================
# WebSocket Real-Time Endpoint
# ==========================================
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
            else:
                try:
                    payload = json.loads(data)
                    if payload.get("action") == "ping":
                        await websocket.send_json({"type": "PONG"})
                except Exception:
                    pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# ==========================================
# Investigators Roster
# ==========================================
INVESTIGATORS = [
    {"id": "inv_1", "name": "Sarah Chen", "role": "Senior Fraud Specialist", "avatar": "SC"},
    {"id": "inv_2", "name": "Marcus Vance", "role": "Lead Risk Operations", "avatar": "MV"},
    {"id": "inv_3", "name": "Elena Rostova", "role": "Financial Crime Analyst", "avatar": "ER"},
    {"id": "inv_4", "name": "David Kalu", "role": "AML & Policy Officer", "avatar": "DK"},
]


@router.get("/investigators")
def get_investigators():
    return INVESTIGATORS


# ==========================================
# Command Center Overview
# ==========================================
@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    rows = db.query(Transaction).all()
    total = len(rows)
    flagged = sum(t.status in ("flagged", "review") for t in rows)
    high = sum(t.risk_level == "high" for t in rows)
    blocked = sum(t.status == "blocked" for t in rows)
    volume = sum(t.amount for t in rows)
    open_cases = sum(t.status in ("flagged", "review", "blocked") for t in rows)
    assigned_count = sum(t.assigned_to is not None and t.status in ("flagged", "review", "blocked") for t in rows)

    recent_txs = db.query(Transaction).order_by(desc(Transaction.id)).limit(10).all()

    # Active model summary
    registry = ml_service.get_registry()
    active_version = registry.get("active_model", "v1.0.0-xgb")
    active_meta = registry.get("models", {}).get(active_version, {})

    # Compute category volumes
    cat_volumes = {}
    for t in rows:
        cat_volumes[t.category] = cat_volumes.get(t.category, 0.0) + t.amount

    return {
        "total_transactions": total,
        "flagged_transactions": flagged,
        "high_risk": high,
        "blocked_transactions": blocked,
        "open_investigations": open_cases,
        "assigned_investigations": assigned_count,
        "total_volume": round(volume, 2),
        "flag_rate": round(flagged / total * 100, 1) if total else 0,
        "active_model": {
            "version": active_version,
            "name": active_meta.get("name", "XGBoost Classifier"),
            "pr_auc": active_meta.get("metrics", {}).get("pr_auc", 0.8474),
            "f1_score": active_meta.get("metrics", {}).get("f1_score", 0.6883),
            "recall": active_meta.get("metrics", {}).get("recall", 0.8673),
            "precision": active_meta.get("metrics", {}).get("precision", 0.5705),
        },
        "recent": [serialize(t) for t in recent_txs],
    }


# ==========================================
# Transactions (Server Pagination & Filtering)
# ==========================================
@router.get("/transactions")
def get_transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    status: Optional[str] = Query(default=None),
    risk_level: Optional[str] = Query(default=None),
    channel: Optional[str] = Query(default=None),
    assigned_to: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    min_amount: Optional[float] = Query(default=None),
    max_amount: Optional[float] = Query(default=None),
    sort_by: str = Query(default="id"),
    sort_order: str = Query(default="desc"),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction)

    # Status filter
    if status and status != "all":
        query = query.filter(Transaction.status == status)

    # Risk level filter
    if risk_level and risk_level != "all":
        query = query.filter(Transaction.risk_level == risk_level)

    # Channel filter
    if channel and channel != "all":
        query = query.filter(Transaction.channel == channel)

    # Assigned investigator filter
    if assigned_to:
        if assigned_to == "unassigned":
            query = query.filter(Transaction.assigned_to.is_(None))
        elif assigned_to != "all":
            query = query.filter(Transaction.assigned_to == assigned_to)

    # Amount range
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)

    # Search keyword
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (Transaction.external_id.ilike(search_pattern))
            | (Transaction.merchant.ilike(search_pattern))
            | (Transaction.card_token.ilike(search_pattern))
            | (Transaction.country.ilike(search_pattern))
            | (Transaction.assigned_to.ilike(search_pattern))
            | (Transaction.category.ilike(search_pattern))
        )

    total_records = query.count()

    # Sorting
    sort_col = getattr(Transaction, sort_by, Transaction.id)
    query = query.order_by(desc(sort_col) if sort_order.lower() == "desc" else asc(sort_col))

    # Pagination
    offset = (page - 1) * page_size
    records = query.offset(offset).limit(page_size).all()
    total_pages = max(1, (total_records + page_size - 1) // page_size)

    return {
        "items": [serialize(t) for t in records],
        "total": total_records,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "summary": {
            "showing_from": offset + 1 if total_records > 0 else 0,
            "showing_to": min(offset + page_size, total_records),
        },
    }


@router.get("/transactions/{transaction_id}")
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    t = db.get(Transaction, transaction_id)
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return serialize(t)


# ==========================================
# Ingestion API with Hybrid ML & Rule Engine
# ==========================================
@router.post("/transactions")
async def create_transaction(payload: TransactionIn, db: Session = Depends(get_db)):
    # 1. Rule Engine score
    rule_score, rule_level, rule_status, rule_reason = score_transaction(
        payload.amount, payload.country, payload.channel, payload.category
    )

    # 2. ML Engine prediction
    ml_pred = ml_service.predict_transaction(
        amount=payload.amount,
        country=payload.country,
        channel=payload.channel,
        category=payload.category,
        db=db,
    )
    ml_score = ml_pred["model_score"]
    active_version = ml_pred["model_version"]

    # 3. Hybrid risk score calculation
    hybrid_score = round(max(ml_score, rule_score * 0.85 + ml_score * 0.15), 1)
    hybrid_score = min(99.0, max(1.0, hybrid_score))

    if hybrid_score >= 70.0:
        level = "high"
        status = "review"
    elif hybrid_score >= 40.0:
        level = "medium"
        status = "flagged"
    else:
        level = "low"
        status = "approved"

    combined_factors = list(dict.fromkeys(ml_pred["risk_factors"] + [rule_reason]))

    t = Transaction(
        external_id=f"PG-{uuid4().hex[:10].upper()}",
        card_token=payload.card_token,
        merchant=payload.merchant,
        category=payload.category,
        amount=payload.amount,
        country=payload.country.upper(),
        channel=payload.channel.lower(),
        payment_method=payload.payment_method,
        client_ip=payload.client_ip or "192.168.1.1",
        device_id=payload.device_id or f"dev_{uuid4().hex[:8]}",
        risk_score=hybrid_score,
        risk_level=level,
        status=status,
        reason=rule_reason,
        risk_factors=json.dumps(combined_factors),
        model_version=active_version,
        model_score=ml_score,
        rule_score=rule_score,
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    # Create immutable audit log
    audit = AuditLog(
        transaction_id=t.id,
        action="TRANSACTION_INGESTED",
        actor="Ingestion Service",
        details=f"Ingested transaction PG-{t.external_id}. Hybrid score: {hybrid_score} (ML: {ml_score}, Rule: {rule_score}). Status: {status}",
    )
    db.add(audit)
    db.commit()

    serialized = serialize(t)
    await ws_manager.broadcast_new_transaction(serialized)
    return serialized


# ==========================================
# Demo Batch Generation with Real ML Scoring
# ==========================================
@router.post("/demo-batch")
async def demo_batch(count: int = Query(default=25, ge=1, le=100), db: Session = Depends(get_db)):
    merchants = [
        ("Northstar Market", "groceries"),
        ("Orbit Electronics", "electronics"),
        ("Metro Coffee", "food"),
        ("Giftly Digital", "gift_cards"),
        ("CloudPay Services", "digital"),
        ("Apex Crypto Exchange", "crypto"),
        ("Global Travel Hub", "travel"),
        ("Prime Luxury Watches", "luxury"),
        ("FastGas Petroleum", "fuel"),
        ("Nexus Gaming Store", "digital"),
    ]
    countries = ["USA", "USA", "USA", "IND", "GBR", "MEX", "NGA", "CAN", "DEU", "BRA"]
    channels = ["online", "pos", "mobile"]
    payment_methods = ["credit_card", "debit_card", "apple_pay", "google_pay", "virtual_card"]

    created = []
    for _ in range(count):
        merchant, category = choice(merchants)
        amount = round(uniform(15, 3200), 2)
        country = choice(countries)
        channel = choice(channels)
        method = choice(payment_methods)
        client_ip = f"{randint(11, 215)}.{randint(10, 250)}.{randint(1, 250)}.{randint(1, 250)}"
        device_id = f"dev_{uuid4().hex[:10]}"

        # ML Prediction & Rule Scoring
        ml_pred = ml_service.predict_transaction(amount, country, channel, category, db=db)
        rule_score, rule_level, rule_status, rule_reason = score_transaction(amount, country, channel, category)

        ml_score = ml_pred["model_score"]
        hybrid_score = round(max(ml_score, rule_score * 0.85 + ml_score * 0.15), 1)
        hybrid_score = min(99.0, max(1.0, hybrid_score))

        if hybrid_score >= 70.0:
            level = "high"
            status = choice(["review", "flagged", "blocked"])
        elif hybrid_score >= 40.0:
            level = "medium"
            status = choice(["flagged", "review"])
        else:
            level = "low"
            status = "approved"

        combined_factors = list(dict.fromkeys(ml_pred["risk_factors"] + [rule_reason]))

        t = Transaction(
            external_id=f"PG-{uuid4().hex[:10].upper()}",
            card_token=f"card_{uuid4().hex[:8]}",
            merchant=merchant,
            category=category,
            amount=amount,
            country=country,
            channel=channel,
            payment_method=method,
            client_ip=client_ip,
            device_id=device_id,
            risk_score=hybrid_score,
            risk_level=level,
            status=status,
            reason=rule_reason,
            risk_factors=json.dumps(combined_factors),
            model_version=ml_pred["model_version"],
            model_score=ml_score,
            rule_score=rule_score,
        )
        db.add(t)
        created.append(t)

    db.commit()

    # Bulk create audit logs for demo batch and broadcast
    for t in created:
        db.refresh(t)
        audit = AuditLog(
            transaction_id=t.id,
            action="TRANSACTION_INGESTED",
            actor="Batch Simulation Engine",
            details=f"Evaluated via active model {t.model_version}. Final risk score: {t.risk_score}/100. Status: {t.status}.",
        )
        db.add(audit)

    db.commit()

    # Broadcast newest transactions to WebSocket
    for t in created[-5:]:
        await ws_manager.broadcast_new_transaction(serialize(t))

    return {
        "created": len(created),
        "active_model": ml_service.active_version,
        "message": f"Successfully ingested {len(created)} transactions evaluated with real {ml_service.active_version} ML model and deterministic rules.",
    }


# ==========================================
# Case Management & Investigation Workflows
# ==========================================
@router.patch("/transactions/{transaction_id}/assign")
async def assign_investigator(
    transaction_id: int, payload: AssignPayload, db: Session = Depends(get_db)
):
    t = db.get(Transaction, transaction_id)
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")

    prev_assignee = t.assigned_to or "Unassigned"
    t.assigned_to = payload.investigator
    t.assigned_at = datetime.now(timezone.utc)
    if t.status == "flagged":
        t.status = "review"

    audit = AuditLog(
        transaction_id=t.id,
        action="INVESTIGATOR_ASSIGNED",
        actor=payload.actor or "Security Supervisor",
        details=f"Case re-assigned from '{prev_assignee}' to '{payload.investigator}'. Case status updated to '{t.status}'.",
    )
    db.add(audit)
    db.commit()
    db.refresh(t)
    db.refresh(audit)

    serialized = serialize(t)
    await ws_manager.broadcast_transaction_updated(serialized)
    await ws_manager.broadcast_audit_log(serialize_audit(audit))
    return serialized


@router.patch("/transactions/{transaction_id}/status")
async def update_status(
    transaction_id: int, payload: StatusUpdatePayload, db: Session = Depends(get_db)
):
    valid_statuses = {"approved", "flagged", "review", "blocked", "resolved"}
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=422, detail=f"Unsupported status. Choose from: {valid_statuses}")

    t = db.get(Transaction, transaction_id)
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")

    old_status = t.status
    t.status = payload.status
    if payload.status in {"resolved", "approved", "blocked"}:
        t.resolved_by = payload.actor or "Security Operator"
        t.resolved_at = datetime.now(timezone.utc)

    if payload.notes:
        existing_notes = t.investigation_notes or ""
        t.investigation_notes = f"{existing_notes}\n[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} - {payload.actor}]: {payload.notes}".strip()

    audit = AuditLog(
        transaction_id=t.id,
        action="STATUS_CHANGED",
        actor=payload.actor or "Security Operator",
        details=f"Transitioned status from '{old_status}' to '{payload.status}'. Notes: {payload.notes or 'None'}",
    )
    db.add(audit)
    db.commit()
    db.refresh(t)
    db.refresh(audit)

    serialized = serialize(t)
    await ws_manager.broadcast_transaction_updated(serialized)
    await ws_manager.broadcast_audit_log(serialize_audit(audit))
    return serialized


@router.post("/transactions/{transaction_id}/notes")
async def add_investigation_note(
    transaction_id: int, payload: NotePayload, db: Session = Depends(get_db)
):
    t = db.get(Transaction, transaction_id)
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")

    existing_notes = t.investigation_notes or ""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    new_entry = f"[{timestamp} - {payload.actor}]: {payload.note}"
    t.investigation_notes = f"{existing_notes}\n{new_entry}".strip()

    audit = AuditLog(
        transaction_id=t.id,
        action="NOTE_ADDED",
        actor=payload.actor or "Security Operator",
        details=f"Added investigation note: {payload.note}",
    )
    db.add(audit)
    db.commit()
    db.refresh(t)
    db.refresh(audit)

    serialized = serialize(t)
    await ws_manager.broadcast_transaction_updated(serialized)
    await ws_manager.broadcast_audit_log(serialize_audit(audit))
    return serialized


@router.get("/transactions/{transaction_id}/audit")
def get_transaction_audit_logs(transaction_id: int, db: Session = Depends(get_db)):
    t = db.get(Transaction, transaction_id)
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.transaction_id == transaction_id)
        .order_by(desc(AuditLog.id))
        .all()
    )
    return [serialize_audit(a) for a in logs]


# ==========================================
# Model Governance & Evaluation Endpoints
# ==========================================
@router.get("/models/registry")
def get_model_registry():
    registry = ml_service.get_registry()
    if not registry:
        raise HTTPException(status_code=503, detail="Model registry is initializing or not trained yet.")
    return registry


@router.get("/models/active")
def get_active_model_details():
    registry = ml_service.get_registry()
    active_version = registry.get("active_model", "v1.0.0-xgb")
    model_data = registry.get("models", {}).get(active_version)
    if not model_data:
        raise HTTPException(status_code=404, detail=f"Active model {active_version} not found in registry")
    return {
        "active_model": active_version,
        "dataset": registry.get("dataset", {}),
        "model_details": model_data,
        "available_versions": list(registry.get("models", {}).keys()),
    }


@router.post("/models/active")
async def set_active_model(payload: ModelSelectionPayload):
    success = ml_service.set_active_model(payload.version)
    if not success:
        raise HTTPException(status_code=400, detail=f"Model version '{payload.version}' does not exist in registry.")

    await ws_manager.broadcast("MODEL_VERSION_CHANGED", {"active_model": payload.version})
    return {
        "status": "success",
        "active_model": payload.version,
        "message": f"Active fraud detection model switched to {payload.version}",
    }


@router.get("/models/monitoring")
def get_model_monitoring(db: Session = Depends(get_db)):
    return ml_service.get_prediction_monitoring_stats(db)


# ==========================================
# Analytics API
# ==========================================
@router.get("/analytics")
def analytics(db: Session = Depends(get_db)):
    rows = db.query(Transaction).all()
    total = len(rows)

    category_buckets = {}
    country_buckets = {}
    channel_buckets = {}

    for t in rows:
        # Category
        cb = category_buckets.setdefault(t.category, {"category": t.category, "count": 0, "volume": 0.0, "flagged": 0})
        cb["count"] += 1
        cb["volume"] = round(cb["volume"] + t.amount, 2)
        cb["flagged"] += int(t.status in ("flagged", "review", "blocked"))

        # Country
        country_b = country_buckets.setdefault(t.country, {"country": t.country, "count": 0, "volume": 0.0, "flagged": 0})
        country_b["count"] += 1
        country_b["volume"] = round(country_b["volume"] + t.amount, 2)
        country_b["flagged"] += int(t.status in ("flagged", "review", "blocked"))

        # Channel
        chan_b = channel_buckets.setdefault(t.channel, {"channel": t.channel, "count": 0, "volume": 0.0, "flagged": 0})
        chan_b["count"] += 1
        chan_b["volume"] = round(chan_b["volume"] + t.amount, 2)
        chan_b["flagged"] += int(t.status in ("flagged", "review", "blocked"))

    return {
        "total_count": total,
        "categories": list(category_buckets.values()),
        "countries": list(country_buckets.values()),
        "channels": list(channel_buckets.values()),
        "risk_distribution": [
            {"name": "Low Risk", "value": sum(t.risk_level == "low" for t in rows), "color": "#10b981"},
            {"name": "Medium Risk", "value": sum(t.risk_level == "medium" for t in rows), "color": "#f59e0b"},
            {"name": "High Risk", "value": sum(t.risk_level == "high" for t in rows), "color": "#ef4444"},
        ],
        "status_distribution": [
            {"name": "Approved", "value": sum(t.status == "approved" for t in rows)},
            {"name": "Flagged", "value": sum(t.status == "flagged" for t in rows)},
            {"name": "Under Review", "value": sum(t.status == "review" for t in rows)},
            {"name": "Blocked", "value": sum(t.status == "blocked" for t in rows)},
            {"name": "Resolved", "value": sum(t.status == "resolved" for t in rows)},
        ],
    }
