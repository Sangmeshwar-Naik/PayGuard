"""
PayGuard Machine Learning Training & Evaluation Pipeline
Trains and evaluates:
1. Logistic Regression (class_weight='balanced')
2. Random Forest (balanced_subsample, max_depth=10)
3. XGBoost (scale_pos_weight calibrated)

Using the standard public Credit Card Fraud Detection benchmark (ULB/Kaggle).
Calculates exact: Precision, Recall, F1-Score, PR-AUC, ROC-AUC, and Confusion Matrix.
Saves versioned artifacts and registry metadata.
"""

import os
import json
import time
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.datasets import fetch_openml
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    average_precision_score,
    roc_auc_score,
    confusion_matrix,
    precision_recall_curve,
    roc_curve,
)

BASE_DIR = Path(__file__).resolve().parent
SAVED_MODELS_DIR = BASE_DIR / "saved_models"
SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)


def load_dataset() -> pd.DataFrame:
    print("[1/5] Loading Credit Card Fraud Detection dataset...")
    # Attempt OpenML fetch first (cached in ~/.scikit_learn_data)
    try:
        data = fetch_openml(name="creditcard", version=1, as_frame=True, parser="auto")
        df = data.frame
        # Ensure Class is integer 0/1
        if df["Class"].dtype == "object" or df["Class"].dtype == "category":
            df["Class"] = df["Class"].astype(str).str.replace("'", "").astype(int)
        print(f"Loaded from OpenML: {df.shape[0]} rows, {df.shape[1]} columns")
        return df
    except Exception as e:
        print(f"OpenML fetch note ({e}), downloading direct benchmark...")
        url = "https://storage.googleapis.com/download.tensorflow.org/data/creditcard.csv"
        df = pd.read_csv(url)
        print(f"Loaded from direct URL: {df.shape[0]} rows, {df.shape[1]} columns")
        return df


def sample_curve_points(x_vals, y_vals, n_points=35):
    """Downsample curve coordinates for compact JSON storage and frontend rendering."""
    if len(x_vals) <= n_points:
        return [{"x": round(float(x), 4), "y": round(float(y), 4)} for x, y in zip(x_vals, y_vals)]
    indices = np.linspace(0, len(x_vals) - 1, n_points, dtype=int)
    return [{"x": round(float(x_vals[i]), 4), "y": round(float(y_vals[i]), 4)} for i in indices]


def train_and_evaluate():
    start_all = time.time()
    df = load_dataset()

    X = df.drop(columns=["Class"])
    y = df["Class"].astype(int)
    feature_names = list(X.columns)

    print(f"[2/5] Class distribution: Normal={int((y == 0).sum())}, Fraud={int((y == 1).sum())} ({y.mean()*100:.3f}% fraud rate)")

    # Stratified 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Train split: {X_train.shape[0]} samples ({int(y_train.sum())} fraud)")
    print(f"Test split:  {X_test.shape[0]} samples ({int(y_test.sum())} fraud)")

    # Feature scaling (fit strictly on train to prevent leakage)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Save scaler
    joblib.dump(scaler, SAVED_MODELS_DIR / "scaler.joblib")
    print("Saved feature scaler to scaler.joblib")

    # Save test sample prototypes for runtime feature synthesis (50 normal, 50 fraud)
    test_df = pd.DataFrame(X_test_scaled, columns=feature_names)
    test_df["Class"] = y_test.values
    normal_prototypes = test_df[test_df["Class"] == 0].drop(columns=["Class"]).head(80).to_dict(orient="records")
    fraud_prototypes = test_df[test_df["Class"] == 1].drop(columns=["Class"]).head(80).to_dict(orient="records")
    with open(SAVED_MODELS_DIR / "feature_prototypes.json", "w") as f:
        json.dump({"normal": normal_prototypes, "fraud": fraud_prototypes, "feature_names": feature_names}, f)

    # Calculate class weight ratio for imbalance
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    scale_pos = neg_count / pos_count if pos_count > 0 else 1.0

    models_config = {
        "logistic_regression": {
            "name": "Logistic Regression",
            "version": "v1.0.0-lr",
            "type": "Linear / Probabilistic",
            "model": LogisticRegression(
                class_weight="balanced",
                max_iter=1000,
                random_state=42,
                solver="lbfgs",
            ),
            "description": "L2-regularized linear baseline with balanced inverse class weighting.",
            "hyperparameters": {
                "penalty": "l2",
                "C": 1.0,
                "solver": "lbfgs",
                "class_weight": "balanced",
                "max_iter": 1000,
            },
        },
        "random_forest": {
            "name": "Random Forest",
            "version": "v1.0.0-rf",
            "type": "Ensemble / Bagging",
            "model": RandomForestClassifier(
                n_estimators=100,
                max_depth=12,
                min_samples_split=5,
                class_weight="balanced_subsample",
                random_state=42,
                n_jobs=-1,
            ),
            "description": "Ensemble of 100 decision trees with balanced bootstrap subsampling and max depth limit.",
            "hyperparameters": {
                "n_estimators": 100,
                "max_depth": 12,
                "min_samples_split": 5,
                "class_weight": "balanced_subsample",
                "random_state": 42,
            },
        },
        "xgboost": {
            "name": "XGBoost Classifier",
            "version": "v1.0.0-xgb",
            "type": "Gradient Boosted Trees",
            "model": XGBClassifier(
                n_estimators=120,
                max_depth=5,
                learning_rate=0.08,
                scale_pos_weight=scale_pos,
                subsample=0.85,
                colsample_bytree=0.85,
                eval_metric="logloss",
                random_state=42,
                n_jobs=-1,
            ),
            "description": "Extreme gradient boosting with calibrated positive class scaling and tree regularization.",
            "hyperparameters": {
                "n_estimators": 120,
                "max_depth": 5,
                "learning_rate": 0.08,
                "scale_pos_weight": round(float(scale_pos), 2),
                "subsample": 0.85,
                "colsample_bytree": 0.85,
            },
        },
    }

    registry = {
        "dataset": {
            "name": "Credit Card Fraud Detection Benchmark (ULB / Kaggle)",
            "total_records": int(df.shape[0]),
            "features_count": len(feature_names),
            "fraud_count": int(y.sum()),
            "fraud_rate": round(float(y.mean() * 100), 3),
            "train_size": int(X_train.shape[0]),
            "test_size": int(X_test.shape[0]),
            "features": feature_names,
        },
        "models": {},
        "active_model": "v1.0.0-xgb",
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    print("\n[3/5] Training and evaluating candidate models on holdout test set...")

    for key, cfg in models_config.items():
        print(f"\n--- Training {cfg['name']} ({cfg['version']}) ---")
        t0 = time.time()
        clf = cfg["model"]
        clf.fit(X_train_scaled, y_train)
        fit_duration = time.time() - t0

        t_infer_start = time.time()
        y_pred = clf.predict(X_test_scaled)
        y_prob = clf.predict_proba(X_test_scaled)[:, 1]
        inference_time_ms = round(((time.time() - t_infer_start) / len(X_test_scaled)) * 1000, 3)

        # Metrics computation
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred))
        f1 = float(f1_score(y_test, y_pred))
        pr_auc = float(average_precision_score(y_test, y_prob))
        roc_auc = float(roc_auc_score(y_test, y_prob))

        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

        # Curves
        precisions, recalls, _ = precision_recall_curve(y_test, y_prob)
        pr_curve = sample_curve_points(recalls, precisions, n_points=35)

        fprs, tprs, _ = roc_curve(y_test, y_prob)
        roc_curve_pts = sample_curve_points(fprs, tprs, n_points=35)

        # Feature importances / coefficients
        feature_importance_list = []
        if hasattr(clf, "feature_importances_"):
            importances = clf.feature_importances_
            top_indices = np.argsort(importances)[::-1][:10]
            for idx in top_indices:
                feature_importance_list.append({
                    "feature": feature_names[idx],
                    "importance": round(float(importances[idx]), 4)
                })
        elif hasattr(clf, "coef_"):
            coefs = np.abs(clf.coef_[0])
            top_indices = np.argsort(coefs)[::-1][:10]
            for idx in top_indices:
                feature_importance_list.append({
                    "feature": feature_names[idx],
                    "importance": round(float(coefs[idx]), 4),
                    "sign": "positive" if clf.coef_[0][idx] > 0 else "negative"
                })

        # Save model artifact
        model_filename = f"{key}_{cfg['version']}.joblib"
        joblib.dump(clf, SAVED_MODELS_DIR / model_filename)

        model_record = {
            "id": key,
            "name": cfg["name"],
            "version": cfg["version"],
            "type": cfg["type"],
            "description": cfg["description"],
            "artifact_file": model_filename,
            "fit_time_seconds": round(fit_duration, 2),
            "inference_latency_ms": inference_time_ms,
            "metrics": {
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1_score": round(f1, 4),
                "pr_auc": round(pr_auc, 4),
                "roc_auc": round(roc_auc, 4),
                "confusion_matrix": {
                    "tn": tn,
                    "fp": fp,
                    "fn": fn,
                    "tp": tp,
                    "total": len(y_test),
                    "accuracy": round((tp + tn) / len(y_test), 5),
                    "false_positive_rate": round(fp / (fp + tn), 5),
                    "false_negative_rate": round(fn / (fn + tp), 5)
                }
            },
            "hyperparameters": cfg["hyperparameters"],
            "top_features": feature_importance_list,
            "curves": {
                "precision_recall": pr_curve,
                "roc": roc_curve_pts
            }
        }

        registry["models"][cfg["version"]] = model_record

        print(f"Completed {cfg['name']}:")
        print(f"  Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f}")
        print(f"  PR-AUC:    {pr_auc:.4f} | ROC-AUC: {roc_auc:.4f}")
        print(f"  Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")

    # Write registry.json
    registry_path = SAVED_MODELS_DIR / "registry.json"
    with open(registry_path, "w") as f:
        json.dump(registry, f, indent=2)

    total_time = round(time.time() - start_all, 2)
    print(f"\n[4/5] Saved model registry to {registry_path}")
    print(f"[5/5] All models trained and evaluated successfully in {total_time}s!")
    return registry


if __name__ == "__main__":
    train_and_evaluate()
