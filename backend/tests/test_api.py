import pytest
from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "payguard" in data["service"]


def test_overview_endpoint(client: TestClient):
    response = client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_transactions" in data
    assert "flagged_transactions" in data
    assert "high_risk" in data
    assert "total_volume" in data
    assert "active_model" in data
    assert "recent" in data


def test_demo_batch_and_ml_scoring(client: TestClient):
    response = client.post("/api/demo-batch?count=10")
    assert response.status_code == 200
    data = response.json()
    assert data["created"] == 10
    assert "active_model" in data


def test_transactions_pagination_and_filtering(client: TestClient):
    # Test page 1 with page size 5
    response = client.get("/api/transactions?page=1&page_size=5&sort_by=id&sort_order=desc")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) <= 5
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert "total" in data
    assert "total_pages" in data

    # Test status filter
    response_flagged = client.get("/api/transactions?status=flagged")
    assert response_flagged.status_code == 200
    flagged_data = response_flagged.json()
    for item in flagged_data["items"]:
        assert item["status"] == "flagged"


def test_investigator_assignment_and_audit(client: TestClient):
    # Fetch a transaction
    txs_resp = client.get("/api/transactions?page_size=1")
    assert txs_resp.status_code == 200
    items = txs_resp.json()["items"]
    assert len(items) > 0
    tx_id = items[0]["id"]

    # Assign investigator
    assign_resp = client.patch(
        f"/api/transactions/{tx_id}/assign",
        json={"investigator": "Marcus Vance", "actor": "Security Lead"},
    )
    assert assign_resp.status_code == 200
    assert assign_resp.json()["assigned_to"] == "Marcus Vance"

    # Add case note
    note_resp = client.post(
        f"/api/transactions/{tx_id}/notes",
        json={"note": "Confirmed valid cardholder KYC credentials.", "actor": "Marcus Vance"},
    )
    assert note_resp.status_code == 200
    assert "Confirmed valid cardholder KYC credentials." in note_resp.json()["investigation_notes"]

    # Verify audit trail contains logged events
    audit_resp = client.get(f"/api/transactions/{tx_id}/audit")
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert len(logs) >= 2
    actions = [l["action"] for l in logs]
    assert "INVESTIGATOR_ASSIGNED" in actions
    assert "NOTE_ADDED" in actions


def test_status_update_flow(client: TestClient):
    txs_resp = client.get("/api/transactions?page_size=1")
    tx_id = txs_resp.json()["items"][0]["id"]

    # Transition to resolved
    resp = client.patch(
        f"/api/transactions/{tx_id}/status",
        json={"status": "resolved", "notes": "Resolved false alarm.", "actor": "Sarah Chen"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "resolved"


def test_model_registry_and_active_switch(client: TestClient):
    reg_resp = client.get("/api/models/registry")
    assert reg_resp.status_code == 200
    registry = reg_resp.json()
    assert "v1.0.0-xgb" in registry["models"]
    assert "v1.0.0-rf" in registry["models"]
    assert "v1.0.0-lr" in registry["models"]

    # Verify model metrics structure
    for version, model in registry["models"].items():
        assert "metrics" in model
        assert "pr_auc" in model["metrics"]
        assert "confusion_matrix" in model["metrics"]
        assert "precision" in model["metrics"]
        assert "recall" in model["metrics"]

    # Switch active model to Random Forest
    switch_resp = client.post("/api/models/active", json={"version": "v1.0.0-rf"})
    assert switch_resp.status_code == 200
    assert switch_resp.json()["active_model"] == "v1.0.0-rf"

    # Verify active endpoint reflects change
    active_resp = client.get("/api/models/active")
    assert active_resp.status_code == 200
    assert active_resp.json()["active_model"] == "v1.0.0-rf"

    # Switch back to XGBoost
    client.post("/api/models/active", json={"version": "v1.0.0-xgb"})


def test_model_prediction_monitoring(client: TestClient):
    mon_resp = client.get("/api/models/monitoring")
    assert mon_resp.status_code == 200
    data = mon_resp.json()
    assert "total_inferences" in data
    assert "avg_latency_ms" in data
    assert "score_distribution" in data
    assert "drift_status" in data


def test_analytics_and_investigators(client: TestClient):
    ana_resp = client.get("/api/analytics")
    assert ana_resp.status_code == 200
    data = ana_resp.json()
    assert "categories" in data
    assert "countries" in data
    assert "channels" in data
    assert "risk_distribution" in data

    inv_resp = client.get("/api/investigators")
    assert inv_resp.status_code == 200
    assert len(inv_resp.json()) >= 4
