"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  ShieldCheck,
  Activity,
  Layers,
  Zap,
  TrendingUp,
  BarChart2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { api, ModelRegistry, ModelMonitoring, ModelRecord } from "@/lib/api";

export default function ModelGovernancePage() {
  const [registry, setRegistry] = useState<ModelRegistry | null>(null);
  const [monitoring, setMonitoring] = useState<ModelMonitoring | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("v1.0.0-xgb");
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = useCallback(async () => {
    try {
      setError("");
      const [reg, mon] = await Promise.all([
        api<ModelRegistry>("/models/registry"),
        api<ModelMonitoring>("/models/monitoring"),
      ]);
      setRegistry(reg);
      setMonitoring(mon);
      if (reg.active_model) {
        setSelectedVersion(reg.active_model);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load model registry");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleActivateModel(version: string) {
    setSwitching(true);
    setError("");
    setSuccessMsg("");
    try {
      await api("/models/active", {
        method: "POST",
        body: JSON.stringify({ version }),
      });
      setSuccessMsg(`Active model successfully transitioned to ${version}.`);
      await loadData();
    } catch (e: any) {
      setError(e.message || "Failed to switch active model");
    } finally {
      setSwitching(false);
    }
  }

  const currentModel: ModelRecord | undefined = registry?.models[selectedVersion];

  // Prepare Precision-Recall comparison data across models
  const prCurveData = currentModel?.curves.precision_recall.map((pt, idx) => ({
    recall: pt.x,
    [currentModel.version]: pt.y,
  })) || [];

  return (
    <motion.div
      className="page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="heading">
        <div>
          <span className="eyebrow">MLOPS & RISK GOVERNANCE</span>
          <h1>Model Observatory</h1>
          <p>
            Offline benchmark validation, live model switching, and real-time prediction drift telemetry.
          </p>
        </div>

        <div className="head-actions">
          <button className="btn secondary" onClick={loadData}>
            <RefreshCw size={15} /> Refresh Telemetry
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {successMsg && (
        <div style={{ padding: "12px 18px", background: "var(--risk-safe-bg)", border: "1px solid var(--risk-safe-border)", borderRadius: "10px", color: "#6ee7b7", fontSize: "12px", marginBottom: "20px" }}>
          {successMsg}
        </div>
      )}

      {/* Dataset Benchmark Attribution */}
      {registry?.dataset && (
        <div className="demo-warning" style={{ background: "rgba(6, 182, 212, 0.08)", borderColor: "var(--border-cyan)", color: "#a5f3fc" }}>
          <Sparkles size={18} style={{ color: "var(--cyan-neon)", flexShrink: 0 }} />
          <div>
            <b style={{ color: "var(--cyan-neon)" }}>Benchmark Dataset: {registry.dataset.name}</b>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
              Total Records: <b>{registry.dataset.total_records.toLocaleString()}</b> · Imbalance: <b>{registry.dataset.fraud_count} Frauds ({registry.dataset.fraud_rate}%)</b> · Train Split: <b>{registry.dataset.train_size.toLocaleString()}</b> · Holdout Test: <b>{registry.dataset.test_size.toLocaleString()}</b>.
              Zero data leakage (Scalers fitted strictly on training partition).
            </div>
          </div>
        </div>
      )}

      {/* 3 Model Comparison Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {registry &&
          Object.values(registry.models).map((model) => {
            const isActive = registry.active_model === model.version;
            const isSelected = selectedVersion === model.version;
            return (
              <div
                key={model.version}
                onClick={() => setSelectedVersion(model.version)}
                style={{
                  background: isSelected
                    ? "linear-gradient(160deg, #162235 0%, #0d1522 100%)"
                    : "linear-gradient(160deg, #111824 0%, #0c1119 100%)",
                  border: isSelected ? "1px solid var(--cyan-bright)" : "1px solid var(--border-subtle)",
                  borderRadius: "14px",
                  padding: "20px",
                  cursor: "pointer",
                  position: "relative",
                  boxShadow: isSelected ? "0 0 25px rgba(6, 182, 212, 0.18)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--cyan-bright)", letterSpacing: "1px" }}>
                      {model.type.toUpperCase()}
                    </span>
                    <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#fff", margin: "4px 0" }}>
                      {model.name}
                    </h3>
                    <code style={{ fontSize: "11px", color: "var(--text-muted)" }}>{model.version}</code>
                  </div>
                  {isActive && (
                    <span
                      style={{
                        padding: "4px 8px",
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid var(--risk-safe)",
                        borderRadius: "6px",
                        color: "#34d399",
                        fontSize: "10px",
                        fontWeight: 800,
                      }}
                    >
                      ACTIVE PROD
                    </span>
                  )}
                </div>

                <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "14px 0 16px", minHeight: "36px", lineHeight: "1.4" }}>
                  {model.description}
                </p>

                {/* Metrics Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "16px" }}>
                  <div className="info-tile">
                    <span>PR-AUC (Primary)</span>
                    <b style={{ color: "var(--cyan-neon)", fontFamily: "JetBrains Mono" }}>
                      {model.metrics.pr_auc.toFixed(4)}
                    </b>
                  </div>
                  <div className="info-tile">
                    <span>F1-Score</span>
                    <b style={{ color: "#fff", fontFamily: "JetBrains Mono" }}>
                      {model.metrics.f1_score.toFixed(4)}
                    </b>
                  </div>
                  <div className="info-tile">
                    <span>Recall (Detection)</span>
                    <b style={{ color: "#34d399", fontFamily: "JetBrains Mono" }}>
                      {(model.metrics.recall * 100).toFixed(1)}%
                    </b>
                  </div>
                  <div className="info-tile">
                    <span>Precision</span>
                    <b style={{ color: "#fbbf24", fontFamily: "JetBrains Mono" }}>
                      {(model.metrics.precision * 100).toFixed(1)}%
                    </b>
                  </div>
                </div>

                {/* Activation Button */}
                {!isActive ? (
                  <button
                    className="btn secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivateModel(model.version);
                    }}
                    disabled={switching}
                    style={{ width: "100%", fontSize: "11px", padding: "8px" }}
                  >
                    Promote to Active Production
                  </button>
                ) : (
                  <div style={{ textAlign: "center", fontSize: "11px", color: "var(--risk-safe)", fontWeight: 700, padding: "8px" }}>
                    ✓ Serving Live Ingestion
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Selected Model Deep Dive: Confusion Matrix & PR Curve */}
      {currentModel && (
        <div className="dash-grid" style={{ marginBottom: "24px" }}>
          {/* Confusion Matrix Panel */}
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Confusion Matrix — {currentModel.name} ({currentModel.version})</h3>
                <p>Holdout Test Set: 56,962 transactions (98 Actual Frauds, 56,864 Normal)</p>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Accuracy: <b>{(currentModel.metrics.confusion_matrix.accuracy * 100).toFixed(2)}%</b>
              </span>
            </div>

            <div className="confusion-matrix-grid">
              <div className="matrix-cell tn">
                <span>True Negatives (TN)</span>
                <b>{currentModel.metrics.confusion_matrix.tn.toLocaleString()}</b>
                <small>Legitimate approved correctly</small>
              </div>
              <div className="matrix-cell fp">
                <span>False Positives (FP)</span>
                <b>{currentModel.metrics.confusion_matrix.fp.toLocaleString()}</b>
                <small>False alerts (FPR: {(currentModel.metrics.confusion_matrix.false_positive_rate * 100).toFixed(3)}%)</small>
              </div>
              <div className="matrix-cell fn">
                <span>False Negatives (FN)</span>
                <b>{currentModel.metrics.confusion_matrix.fn.toLocaleString()}</b>
                <small>Missed fraud cases</small>
              </div>
              <div className="matrix-cell tp">
                <span>True Positives (TP)</span>
                <b>{currentModel.metrics.confusion_matrix.tp.toLocaleString()}</b>
                <small>Confirmed fraud caught ({((currentModel.metrics.confusion_matrix.tp / 98) * 100).toFixed(1)}% caught)</small>
              </div>
            </div>

            <div style={{ marginTop: "16px", padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", borderRadius: "8px", fontSize: "11px", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
              <span>Training Duration: <b>{currentModel.fit_time_seconds}s</b></span>
              <span>Avg Latency: <b>{currentModel.inference_latency_ms.toFixed(2)} ms/tx</b></span>
              <span>ROC-AUC: <b>{currentModel.metrics.roc_auc.toFixed(4)}</b></span>
            </div>
          </section>

          {/* Precision-Recall Curve Chart */}
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Precision-Recall Trajectory</h3>
                <p>PR-AUC Score: {currentModel.metrics.pr_auc.toFixed(4)}</p>
              </div>
              <TrendingUp size={18} color="var(--cyan-bright)" />
            </div>

            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis
                    dataKey="recall"
                    stroke="#64748b"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    fontFamily="JetBrains Mono"
                    tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                    label={{ value: "Recall", position: "insideBottomRight", offset: -5, fill: "#64748b", fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    fontFamily="JetBrains Mono"
                    tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                    label={{ value: "Precision", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0c121e",
                      border: "1px solid rgba(6, 182, 212, 0.35)",
                      borderRadius: "10px",
                      color: "#fff",
                    }}
                    formatter={(val: any) => [`${(Number(val) * 100).toFixed(1)}%`, "Precision"]}
                    labelFormatter={(label) => `Recall: ${(Number(label) * 100).toFixed(1)}%`}
                  />
                  <Line
                    type="monotone"
                    dataKey={currentModel.version}
                    stroke="#00f2fe"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {/* Prediction Monitoring & Drift Telemetry */}
      {monitoring && (
        <section className="panel" style={{ marginBottom: "24px" }}>
          <div className="panel-head">
            <div>
              <h3>Production Prediction Monitoring & Score Distribution</h3>
              <p>Fleet-wide score histogram and Population Stability Index (PSI)</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  padding: "4px 10px",
                  background: monitoring.drift_status === "NORMAL" ? "var(--risk-safe-bg)" : "var(--risk-warning-bg)",
                  border: `1px solid ${monitoring.drift_status === "NORMAL" ? "var(--risk-safe-border)" : "var(--risk-warning-border)"}`,
                  borderRadius: "6px",
                  color: monitoring.drift_status === "NORMAL" ? "#34d399" : "#fbbf24",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                DRIFT STATUS: {monitoring.drift_status} (PSI: {monitoring.psi_score.toFixed(4)})
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", justifyContent: "center" }}>
              <div className="info-tile">
                <span>Total Live Inferences Logged</span>
                <b style={{ fontSize: "20px" }}>{monitoring.total_inferences.toLocaleString()}</b>
              </div>
              <div className="info-tile">
                <span>Mean Inference Latency</span>
                <b style={{ fontSize: "20px", color: "var(--cyan-neon)" }}>{monitoring.avg_latency_ms.toFixed(2)} ms</b>
              </div>
              <div className="info-tile">
                <span>Target Serving Model</span>
                <b style={{ fontSize: "16px" }}>{monitoring.active_model}</b>
              </div>
            </div>

            <div style={{ height: "200px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monitoring.score_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis dataKey="range" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontFamily="JetBrains Mono" />
                  <Tooltip
                    contentStyle={{
                      background: "#0c121e",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* Feature Explainability Top 10 */}
      {currentModel?.top_features && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Top Anomaly Attribution Features</h3>
              <p>Relative feature weightings and PCA coefficients driving model decisions</p>
            </div>
            <BarChart2 size={18} color="var(--cyan-bright)" />
          </div>

          <div style={{ height: "240px", marginTop: "10px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={currentModel.top_features}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
              >
                <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} fontFamily="JetBrains Mono" />
                <YAxis dataKey="feature" type="category" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={11} fontFamily="JetBrains Mono" />
                <Tooltip
                  contentStyle={{
                    background: "#0c121e",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(val) => [Number(val).toFixed(4), "Importance"]}
                />
                <Bar dataKey="importance" fill="#00f2fe" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </motion.div>
  );
}
