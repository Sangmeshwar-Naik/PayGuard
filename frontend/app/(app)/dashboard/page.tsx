"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ArrowLeftRight,
  DollarSign,
  Activity,
  Plus,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  Clock3,
  Shield,
  Zap,
  Radio,
  Sliders,
  CheckCircle2,
  Ban,
  Layers,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Link from "next/link";
import { api, Tx, Overview } from "@/lib/api";
import { useWebSocketFeed } from "@/lib/useWebSocket";
import InvestigationDrawer from "@/components/InvestigationDrawer";

export default function Dashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);
  const [livePulse, setLivePulse] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<Overview>("/overview");
      setData(res);
      setError("");
    } catch (e: any) {
      setError(e.message || "Risk Engine API unreachable");
    }
  }, []);

  // Real-time WebSocket hook
  useWebSocketFeed({
    onNewTransaction: (tx) => {
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 1200);
      setData((prev) => {
        if (!prev) return prev;
        const exists = prev.recent.some((r) => r.id === tx.id);
        const updatedRecent = exists
          ? prev.recent.map((r) => (r.id === tx.id ? tx : r))
          : [tx, ...prev.recent.slice(0, 9)];

        const isFlagged = tx.status === "flagged" || tx.status === "review";
        const isHigh = tx.risk_level === "high";

        return {
          ...prev,
          total_transactions: exists ? prev.total_transactions : prev.total_transactions + 1,
          flagged_transactions: exists ? prev.flagged_transactions : prev.flagged_transactions + (isFlagged ? 1 : 0),
          high_risk: exists ? prev.high_risk : prev.high_risk + (isHigh ? 1 : 0),
          total_volume: exists ? prev.total_volume : prev.total_volume + tx.amount,
          recent: updatedRecent,
        };
      });
    },
    onTransactionUpdated: (tx) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recent: prev.recent.map((r) => (r.id === tx.id ? tx : r)),
        };
      });
      if (selectedTx?.id === tx.id) {
        setSelectedTx(tx);
      }
    },
  });

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function generateBatch() {
    setBusy(true);
    try {
      await api("/demo-batch?count=20", { method: "POST" });
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to trigger live batch ingestion");
    } finally {
      setBusy(false);
    }
  }

  // Activity profile data
  const trend = [
    { time: "09:00", volume: 18400, count: 42 },
    { time: "10:00", volume: 29800, count: 68 },
    { time: "11:00", volume: 38200, count: 85 },
    { time: "12:00", volume: 54100, count: 124 },
    { time: "13:00", volume: 49200, count: 106 },
    { time: "14:00", volume: 72300, count: 148 },
    { time: "15:00", volume: 64900, count: 132 },
    { time: "16:00", volume: 88500, count: 185 },
  ];

  return (
    <motion.div
      className="page"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Page Heading */}
      <div className="heading">
        <div>
          <span className="eyebrow">COMMAND & CONTROL / REAL-TIME RISK POSTURE</span>
          <h1>Security Overview</h1>
          <p>
            Autonomous fraud arbitration combining calibrated ML inference with deterministic guardrails.
          </p>
        </div>

        <div className="head-actions">
          <button className="btn secondary" onClick={load}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn primary" onClick={generateBatch} disabled={busy}>
            <Plus size={16} />
            {busy ? "Evaluating ML Inference..." : "Ingest Live Batch"}
          </button>
        </div>
      </div>

      {/* Model & Sandbox Information Ribbon */}
      <div className="demo-warning">
        <Zap size={18} style={{ color: "var(--cyan-neon)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <b>Active ML Defense Engine: {data?.active_model?.name || "XGBoost"} ({data?.active_model?.version || "v1.0.0-xgb"})</b>
          <span style={{ display: "block", color: "var(--text-secondary)", marginTop: "2px", fontSize: "11px" }}>
            Real-time inference active · Evaluated on Credit Card Fraud benchmark (PR-AUC: {data?.active_model?.pr_auc != null ? data.active_model.pr_auc.toFixed(4) : "0.8474"}, Recall: {data?.active_model?.recall != null ? data.active_model.recall.toFixed(4) : "0.8673"}).
          </span>
        </div>
        <Link href="/model" style={{ color: "var(--cyan-neon)", fontSize: "11px", fontWeight: 700, textDecoration: "underline" }}>
          Model Governance →
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* 4 Primary KPI Metrics */}
      <div className="metrics">
        <MetricCard
          icon={<ArrowLeftRight />}
          label="Total Transactions"
          value={data?.total_transactions.toLocaleString() ?? "—"}
          note="Streamed event volume"
          color="cyan"
          pulse={livePulse}
        />
        <MetricCard
          icon={<ShieldAlert />}
          label="Flagged for Review"
          value={data?.flagged_transactions.toLocaleString() ?? "—"}
          note={`${data?.flag_rate ?? 0}% overall flag rate`}
          color="amber"
        />
        <MetricCard
          icon={<Activity />}
          label="High Risk Anomalies"
          value={data?.high_risk.toLocaleString() ?? "—"}
          note="Score ≥ 70 / 100"
          color="red"
        />
        <MetricCard
          icon={<DollarSign />}
          label="Total Volume Processed"
          value={data ? `$${data.total_volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          note="Gross arbitrated value"
          color="blue"
        />
      </div>

      {/* Dash Grid: Charts and Risk Posture */}
      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Arbitration Activity Profile</h3>
              <p>Simulated hourly transaction ingestion volume and anomaly intensity</p>
            </div>
            <span style={{ fontSize: "11px", color: "var(--cyan-bright)", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
              <Radio size={12} className="pulse-dot" /> LIVE EVENT FEED
            </span>
          </div>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cyanArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f2fe" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="blueArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  fontFamily="JetBrains Mono"
                />
                <YAxis
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  fontFamily="JetBrains Mono"
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0c121e",
                    border: "1px solid rgba(6, 182, 212, 0.35)",
                    borderRadius: "10px",
                    color: "#fff",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                  }}
                  formatter={(value: any, name: any) => [
                    name === "volume" ? `$${Number(value).toLocaleString()}` : value,
                    name === "volume" ? "Transaction Value" : "Event Count",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#00f2fe"
                  strokeWidth={2.5}
                  fill="url(#cyanArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Posture Ring */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Risk Posture Gauge</h3>
              <p>Fleet-wide exposure rating</p>
            </div>
            <ShieldCheck color="#10b981" size={20} />
          </div>

          <div className="posture-score">
            <div>
              <b>{data?.flag_rate ?? 0}%</b>
              <small>Flag Rate</small>
            </div>
            <div className="score-ring">
              <Shield size={36} />
            </div>
          </div>

          <div className="posture-line">
            <span>Open Cases / Investigations</span>
            <b>{data?.open_investigations ?? 0} cases</b>
          </div>
          <div className="posture-line">
            <span>Assigned to Analysts</span>
            <b className="green-text">{data?.assigned_investigations ?? 0} active</b>
          </div>
          <div className="posture-line">
            <span>High Risk Anomalies</span>
            <b className="red-text">{data?.high_risk ?? 0} flagged</b>
          </div>
          <div className="posture-line">
            <span>Confirmed Blocked</span>
            <b className="red-text">{data?.blocked_transactions ?? 0} cards</b>
          </div>
        </section>
      </div>

      {/* Recent Real-Time Transactions Table */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Live Ingested Transactions</h3>
            <p>Real-time event stream evaluated by active ML arbiter (Click any row to investigate)</p>
          </div>
          <Link href="/transactions" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--cyan-bright)", fontSize: "12px", fontWeight: 700 }}>
            <span>View Full Ledger</span>
            <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>TRANSACTION ID</th>
                <th>MERCHANT / CATEGORY</th>
                <th>CORRIDOR</th>
                <th>AMOUNT</th>
                <th>RISK SCORE</th>
                <th>STATUS</th>
                <th>INVESTIGATOR</th>
              </tr>
            </thead>
            <tbody>
              {data?.recent.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <b>{tx.external_id}</b>
                    <small>{tx.card_token}</small>
                  </td>
                  <td>
                    <b>{tx.merchant}</b>
                    <small>{tx.category.toUpperCase()} · {tx.channel.toUpperCase()}</small>
                  </td>
                  <td>
                    <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#fff" }}>
                      {tx.country}
                    </span>
                  </td>
                  <td className="amount">${tx.amount.toFixed(2)}</td>
                  <td>
                    <div className="risk-cell">
                      <span className="risk-num" style={{ color: tx.risk_score >= 70 ? "var(--risk-danger)" : tx.risk_score >= 40 ? "var(--risk-warning)" : "var(--risk-safe)" }}>
                        {tx.risk_score.toFixed(0)}
                      </span>
                      <div className="risk-bar">
                        <div
                          className={`risk-fill ${tx.risk_level}`}
                          style={{ width: `${Math.min(100, tx.risk_score)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status ${tx.status}`}>{tx.status}</span>
                  </td>
                  <td>
                    {tx.assigned_to ? (
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--cyan-neon)" }}>
                        {tx.assigned_to}
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Unassigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!data?.recent.length && (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
              No transactions ingested yet. Click &ldquo;Ingest Live Batch&rdquo; to populate the platform.
            </div>
          )}
        </div>
      </section>

      {/* Footnote */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "11px", marginTop: "20px" }}>
        <Clock3 size={14} />
        <span>Live streaming via WebSockets. Instant synchronization with transaction ledger and audit logs.</span>
      </div>

      {/* Investigation Slide-over Drawer */}
      <InvestigationDrawer
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onUpdate={(updated) => {
          setSelectedTx(updated);
          load();
        }}
      />
    </motion.div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
  color,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  note: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="metric"
      style={{
        boxShadow: pulse ? "0 0 25px rgba(0, 242, 254, 0.35)" : undefined,
        borderColor: pulse ? "var(--cyan-bright)" : undefined,
      }}
    >
      <div className="metric-header">
        <div className={`metric-icon ${color}`}>{icon}</div>
      </div>
      <span className="metric-label">{label}</span>
      <div className="metric-value">{value}</div>
      <span className="metric-note">{note}</span>
    </motion.div>
  );
}
