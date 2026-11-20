"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Shield,
  Sliders,
  Bell,
  Cpu,
  CheckCircle,
  Database,
  Radio,
  Lock,
} from "lucide-react";
import { api, ModelRegistry } from "@/lib/api";

export default function SettingsPage() {
  const [highRiskThreshold, setHighRiskThreshold] = useState(70);
  const [reviewThreshold, setReviewThreshold] = useState(40);
  const [autoBlockThreshold, setAutoBlockThreshold] = useState(90);
  const [activeModel, setActiveModel] = useState("v1.0.0-xgb");
  const [registry, setRegistry] = useState<ModelRegistry | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<ModelRegistry>("/models/registry")
      .then((reg) => {
        setRegistry(reg);
        if (reg.active_model) setActiveModel(reg.active_model);
      })
      .catch(() => {});
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <motion.div
      className="page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="heading">
        <div>
          <span className="eyebrow">RISK POLICY CONFIGURATION</span>
          <h1>System Settings</h1>
          <p>Calibrate risk thresholds, select default ML defense models, and configure audit policies.</p>
        </div>

        <div className="head-actions">
          {saved && (
            <span style={{ color: "#34d399", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
              <CheckCircle size={15} /> Preferences Persisted
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} style={{ maxWidth: "880px" }}>
        {/* Risk Threshold Sliders */}
        <section className="panel" style={{ marginBottom: "20px" }}>
          <div className="panel-head">
            <div>
              <h3>Autonomous Risk Thresholds</h3>
              <p>Deterministic cutoffs for automated transaction flagging and card blocks</p>
            </div>
            <Sliders size={18} color="var(--cyan-bright)" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "16px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                <span>Critical / High Risk Flag Threshold</span>
                <b style={{ color: "var(--risk-danger)", fontFamily: "JetBrains Mono" }}>{highRiskThreshold} / 100</b>
              </div>
              <input
                type="range"
                min={50}
                max={95}
                value={highRiskThreshold}
                onChange={(e) => setHighRiskThreshold(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--risk-danger)" }}
              />
              <small style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                Transactions scoring at or above this threshold trigger immediate operator review alerts.
              </small>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                <span>Medium Risk / Review Threshold</span>
                <b style={{ color: "var(--risk-warning)", fontFamily: "JetBrains Mono" }}>{reviewThreshold} / 100</b>
              </div>
              <input
                type="range"
                min={20}
                max={60}
                value={reviewThreshold}
                onChange={(e) => setReviewThreshold(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--risk-warning)" }}
              />
              <small style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                Transactions scoring at or above this threshold are flagged for asynchronous triage.
              </small>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                <span>Instant Auto-Block Threshold</span>
                <b style={{ color: "#f87171", fontFamily: "JetBrains Mono" }}>{autoBlockThreshold} / 100</b>
              </div>
              <input
                type="range"
                min={80}
                max={99}
                value={autoBlockThreshold}
                onChange={(e) => setAutoBlockThreshold(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#f87171" }}
              />
              <small style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                Transactions reaching this score are automatically blocked to prevent capital leakage.
              </small>
            </div>
          </div>
        </section>

        {/* Machine Learning Engine */}
        <section className="panel" style={{ marginBottom: "20px" }}>
          <div className="panel-head">
            <div>
              <h3>Active Machine Learning Inference Model</h3>
              <p>Designated primary classifier for transaction arbitration</p>
            </div>
            <Cpu size={18} color="var(--cyan-bright)" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "16px" }}>
            {registry &&
              Object.values(registry.models).map((m) => (
                <div
                  key={m.version}
                  onClick={() => setActiveModel(m.version)}
                  style={{
                    padding: "14px",
                    background: activeModel === m.version ? "rgba(6, 182, 212, 0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${activeModel === m.version ? "var(--cyan-bright)" : "var(--border-subtle)"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "10px", color: "var(--cyan-neon)", fontWeight: 700 }}>
                    {m.type.toUpperCase()}
                  </span>
                  <b style={{ display: "block", fontSize: "14px", margin: "4px 0" }}>{m.name}</b>
                  <code style={{ fontSize: "10px", color: "var(--text-muted)" }}>{m.version}</code>
                  <div style={{ marginTop: "10px", fontSize: "11px", color: "var(--text-secondary)" }}>
                    PR-AUC: <b>{m.metrics.pr_auc.toFixed(4)}</b>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* Telemetry & Auditing Controls */}
        <section className="panel" style={{ marginBottom: "24px" }}>
          <div className="panel-head">
            <div>
              <h3>Surveillance & Compliance</h3>
              <p>Immutable audit retention and streaming parameters</p>
            </div>
            <Lock size={18} color="var(--cyan-bright)" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <b style={{ fontSize: "13px" }}>WebSocket Real-Time Event Dispatch</b>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  Broadcast each ingested transaction and status transition to connected operators.
                </p>
              </div>
              <input type="checkbox" defaultChecked style={{ width: "18px", height: "18px", accentColor: "var(--cyan-neon)" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
              <div>
                <b style={{ fontSize: "13px" }}>Immutable Audit Chain of Custody</b>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  Mandatory operator attribution and timestamp recording for SOC2 / PCI-DSS compliance.
                </p>
              </div>
              <input type="checkbox" defaultChecked disabled style={{ width: "18px", height: "18px", accentColor: "var(--cyan-neon)" }} />
            </div>
          </div>
        </section>

        <button type="submit" className="btn primary">
          Save Configuration
        </button>
      </form>
    </motion.div>
  );
}
