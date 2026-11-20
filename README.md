# PayGuard — Real-Time Financial Fraud Detection Platform

Institutional-grade financial fraud surveillance and risk arbitration platform combining calibrated machine learning inference with deterministic guardrails, real-time WebSocket event streaming, and case management with an immutable audit trail.

---

## Key Features

1. **Fintech Visual Identity & Framer Motion UI**
   - Palette engineered for institutional risk centers: High-contrast Charcoal (`#06090e`), Deep Navy (`#0a1122`), Luminous Cyan (`#00f2fe`), and Electric Blue (`#3b82f6`).
   - Semantic fraud indicators: Emerald (Safe), Amber (Under Review), Crimson (Critical Anomaly / Blocked).
   - Smooth Framer Motion transitions, live pulsing feeds, and responsive slide-over dossiers.

2. **Real-Time Streaming Surveillance (WebSockets)**
   - Bidirectional WebSocket streaming hub (`ws://localhost:8001/api/ws`) delivering live transaction events, telemetry, and status transitions without polling.
   - Automatic exponential-backoff reconnection and connection health indicators.

3. **Advanced Transaction Ledger with Server Pagination**
   - Multi-dimensional query engine: filter by status, risk severity tier, payment channel (online, POS, mobile), and investigator.
   - Text search across transaction IDs, merchants, card tokens, and countries.
   - Server-side pagination and column sorting with CSV export capability.

4. **Case Dossier & Investigation Workbench**
   - Interactive slide-over case drawer for deep forensic inspection.
   - Risk factor decomposition: Hybrid score breaking down ML anomaly probabilities vs. deterministic policy rules.
   - Telemetry inspection: Client IP, device fingerprint, transaction channel, and corridor.

5. **Investigator Custody & Immutable Audit Trail**
   - Case assignment workflow across senior analysts (Sarah Chen, Marcus Vance, Elena Rostova, David Kalu).
   - Case notes log with author attribution and timestamps.
   - Immutable audit trail recording every event (`TRANSACTION_INGESTED`, `INVESTIGATOR_ASSIGNED`, `STATUS_CHANGED`, `NOTE_ADDED`) for SOC2/PCI-DSS compliance.

6. **Genuine Machine Learning Benchmark & Governance**
   - Trained and evaluated on the public **Credit Card Fraud Detection benchmark (ULB / Kaggle)**: 284,807 transactions, 30 features ($V_1-V_{28}$, Time, Amount), 0.173% fraud class imbalance.
   - **Zero fabricated metrics**: Evaluated using leakage-safe, stratified 80/20 holdout splits.
   - **Model Comparison**:
     - **Logistic Regression (`v1.0.0-lr`)**: PR-AUC 0.7182 | Recall 91.8% | Precision 5.86% | F1 0.1101
     - **Random Forest (`v1.0.0-rf`)**: PR-AUC 0.8249 | Recall 79.6% | Precision 83.87% | F1 0.8168
     - **XGBoost Classifier (`v1.0.0-xgb`)**: PR-AUC 0.8474 | Recall 86.7% | Precision 57.05% | F1 0.6883
   - Interactive Confusion Matrix heatmaps, Precision-Recall curves, and feature explainability rankings.
   - Dynamic model hot-swapping and live prediction drift monitoring (Population Stability Index / latency telemetry).

---

## Architecture

```
                                  PAYGUARD PLATFORM ARCHITECTURE
                                  
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │                               NEXT.JS 15 CLIENT (REACT 19)                             │
  │   Charcoal (#06090e) · Deep Navy (#0a1122) · Luminous Cyan (#00f2fe) · Electric Blue    │
  ├───────────────────┬─────────────────────────┬──────────────────────┬───────────────────┤
  │ Command Center    │ Real-Time Ledger        │ Investigation Lab    │ Model Governance  │
  │ • Live KPI Pulse  │ • Server Pagination     │ • Slide-Over Drawer  │ • Model Compare   │
  │ • Event Feed      │ • Multi-param Search    │ • Investigator Assign│ • Confusion Matrix│
  │ • Posture Gauges  │ • Range & Multi-Filters │ • Audit History      │ • PR-AUC Curves   │
  └─────────▲─────────┴────────────▲────────────┴──────────▲───────────┴─────────▲─────────┘
            │                      │                       │                       │
      WebSocket Feed               │               REST API JSON                   │
  ┌─────────▼──────────────────────▼───────────────────────▼───────────────────────▼─────────┐
  │                               FASTAPI BACKEND RUNTIME                                  │
  │                                                                                        │
  │   [WebSocket Hub] ── Broadcasts Live Events (Transactions, Alerts, Status Changes)     │
  │                                                                                        │
  │   [Ingestion API] ───────► [Rules Engine] ────┐                                        │
  │                                               ├─► [Hybrid Risk Arbiter] ──► [Audit Log]│
  │                            [ML Inference] ────┘   (Deterministic + Probabilistic)     │
  │                                   ▲                                                    │
  │                                   │ (Active Model)                                     │
  │   [Model Registry & Drift API] ───┴───────────────────────────────┐                    │
  │   • Versioning (v1.0.0-xgb, v1.0.0-rf, v1.0.0-lr)                 │                    │
  │   • Evaluation Metrics: Precision, Recall, F1, PR-AUC, CM Matrix  │                    │
  └───────────────────────────────────┬───────────────────────────────┴────────────────────┘
                                      │
  ┌───────────────────────────────────▼────────────────────────────────────────────────────┐
  │                               PERSISTENCE & STORAGE                                    │
  │   • Transactions (enriched)   • AuditLogs (immutable timeline)                         │
  │   • Model Registry Artifacts  • Prediction Drift & Latency Telemetry                   │
  └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Quickstart

### Option A: Docker Compose (Recommended)
```bash
docker compose up --build
```
- Frontend: http://localhost:3001
- Backend Docs: http://localhost:8001/docs

### Option B: Local PowerShell Setup

#### 1. Backend
```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# (Optional) Re-train or evaluate ML benchmark models:
python app/ml/train.py

# Run API & WebSocket service:
uvicorn app.main:app --reload --port 8001
```

#### 2. Frontend
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:3001 in your browser.

---

## Automated Test Suite

Run the comprehensive automated test suite verifying APIs, WebSocket manager, pagination, audit logs, and ML inference:

```powershell
cd backend
.\.venv\Scripts\pytest.exe tests -v
```

All 11 test suites validate:
- Endpoint health and CORS headers
- Transaction pagination and multi-parameter filtering
- Case custody assignment and note logging
- Immutable audit trail generation
- Model switching (`v1.0.0-xgb` ↔ `v1.0.0-rf`)
- ML inference latency bounds (< 200ms)
- Score distribution and drift calculation
