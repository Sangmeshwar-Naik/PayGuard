from app.ml.service import ml_service


def test_ml_service_active_model_prediction():
    res = ml_service.predict_transaction(
        amount=1250.0,
        country="NGA",
        channel="online",
        category="crypto",
    )
    assert "fraud_probability" in res
    assert "model_score" in res
    assert "risk_factors" in res
    assert "latency_ms" in res
    assert res["model_score"] >= 0
    assert res["model_score"] <= 100
    assert res["latency_ms"] < 200  # Strict inference latency target


def test_ml_service_registry_contents():
    registry = ml_service.get_registry()
    assert "models" in registry
    assert "dataset" in registry
    assert registry["dataset"]["total_records"] == 284807
    assert len(registry["models"]) >= 3

    xgb = registry["models"]["v1.0.0-xgb"]
    assert xgb["metrics"]["pr_auc"] > 0.80
    assert xgb["metrics"]["roc_auc"] > 0.95
