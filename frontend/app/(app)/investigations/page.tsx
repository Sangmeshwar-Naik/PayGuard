"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Ban,
  Layers,
  Search,
  Filter,
} from "lucide-react";
import { api, Tx, PaginatedTx } from "@/lib/api";
import { useWebSocketFeed } from "@/lib/useWebSocket";
import InvestigationDrawer from "@/components/InvestigationDrawer";

export default function InvestigationsPage() {
  const [cases, setCases] = useState<Tx[]>([]);
  const [filterTab, setFilterTab] = useState<"open" | "unassigned" | "high_risk" | "resolved">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch up to 100 cases
      const res = await api<PaginatedTx>("/transactions?page_size=100&sort_by=id&sort_order=desc");
      setCases(res.items);
    } catch (e: any) {
      setError(e.message || "Failed to load investigation cases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  useWebSocketFeed({
    onNewTransaction: (tx) => {
      if (["flagged", "review", "blocked"].includes(tx.status)) {
        setCases((prev) => [tx, ...prev.filter((c) => c.id !== tx.id)]);
      }
    },
    onTransactionUpdated: (tx) => {
      setCases((prev) => prev.map((c) => (c.id === tx.id ? tx : c)));
      if (selectedTx?.id === tx.id) {
        setSelectedTx(tx);
      }
    },
  });

  // Filter cases based on active tab and search query
  const filteredCases = cases.filter((t) => {
    const isMatch = [t.external_id, t.merchant, t.card_token, t.assigned_to || ""].join(" ").toLowerCase().includes(searchQuery.toLowerCase());
    if (!isMatch) return false;

    if (filterTab === "open") {
      return ["flagged", "review", "blocked"].includes(t.status);
    }
    if (filterTab === "unassigned") {
      return ["flagged", "review", "blocked"].includes(t.status) && !t.assigned_to;
    }
    if (filterTab === "high_risk") {
      return t.risk_level === "high" && t.status !== "resolved";
    }
    if (filterTab === "resolved") {
      return t.status === "resolved" || t.status === "approved";
    }
    return true;
  });

  const totalOpen = cases.filter((c) => ["flagged", "review", "blocked"].includes(c.status)).length;
  const unassignedCount = cases.filter((c) => ["flagged", "review", "blocked"].includes(c.status) && !c.assigned_to).length;
  const highRiskCount = cases.filter((c) => c.risk_level === "high" && c.status !== "resolved").length;

  async function resolveQuick(id: number) {
    try {
      const updated = await api<Tx>(`/transactions/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved", notes: "Case marked as resolved via quick triage.", actor: "Security Operator" }),
      });
      setCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e: any) {
      setError(e.message || "Failed to resolve case");
    }
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
          <span className="eyebrow">CASE MANAGEMENT & AUDIT TIMELINE</span>
          <h1>Investigations</h1>
          <p>Triage anomalous transactions, assign investigators, and maintain immutable custody logs.</p>
        </div>

        <div className="head-actions">
          <span
            style={{
              padding: "8px 16px",
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid var(--risk-warning-border)",
              borderRadius: "8px",
              color: "#fbbf24",
              fontSize: "12px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ShieldAlert size={16} />
            <span>{totalOpen} OPEN INVESTIGATIONS</span>
          </span>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Triage Tabs & Search Toolbar */}
      <div className="toolbar" style={{ marginBottom: "24px" }}>
        <div className="filters-group">
          <button
            className={`filter-btn ${filterTab === "open" ? "selected" : ""}`}
            onClick={() => setFilterTab("open")}
          >
            Active Cases ({totalOpen})
          </button>
          <button
            className={`filter-btn ${filterTab === "unassigned" ? "selected" : ""}`}
            onClick={() => setFilterTab("unassigned")}
          >
            Unassigned ({unassignedCount})
          </button>
          <button
            className={`filter-btn ${filterTab === "high_risk" ? "selected" : ""}`}
            onClick={() => setFilterTab("high_risk")}
          >
            High Severity ({highRiskCount})
          </button>
          <button
            className={`filter-btn ${filterTab === "resolved" ? "selected" : ""}`}
            onClick={() => setFilterTab("resolved")}
          >
            Resolved Cases
          </button>
        </div>

        <div className="search-input-wrap">
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by ID, Merchant, Investigator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Case Dossiers Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "18px",
        }}
      >
        {filteredCases.map((tx) => (
          <motion.article
            key={tx.id}
            whileHover={{ y: -3 }}
            style={{
              background: "linear-gradient(150deg, #111723 0%, #0c111a 100%)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-card)",
              cursor: "pointer",
            }}
            onClick={() => setSelectedTx(tx)}
          >
            {/* Top Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className={`status ${tx.status}`}>{tx.status}</span>
              <span
                style={{
                  fontFamily: "JetBrains Mono",
                  fontWeight: 800,
                  fontSize: "14px",
                  color: tx.risk_score >= 70 ? "var(--risk-danger)" : "var(--risk-warning)",
                }}
              >
                {tx.risk_score.toFixed(1)} / 100
              </span>
            </div>

            {/* Merchant & IDs */}
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#fff", margin: "14px 0 4px" }}>
              {tx.merchant}
            </h3>
            <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {tx.external_id} · <span style={{ fontFamily: "JetBrains Mono" }}>{tx.card_token}</span>
            </p>

            {/* Amount & Corridor */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                margin: "18px 0 14px",
                padding: "12px 14px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
              }}
            >
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#fff", fontFamily: "JetBrains Mono" }}>
                ${tx.amount.toFixed(2)}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600 }}>
                {tx.country} · {tx.channel.toUpperCase()}
              </div>
            </div>

            {/* Risk Factors / Reason */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 12px",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid var(--risk-warning-border)",
                borderRadius: "8px",
                color: "#fde68a",
                fontSize: "11px",
                lineHeight: "1.4",
                marginBottom: "16px",
                minHeight: "48px",
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0, color: "var(--risk-warning)", marginTop: "1px" }} />
              <div>
                <b>Signal: </b>
                {tx.risk_factors && tx.risk_factors.length ? tx.risk_factors[0] : tx.reason || "High anomaly score"}
              </div>
            </div>

            {/* Custody Info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "12px",
                borderTop: "1px solid var(--border-subtle)",
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <UserCheck size={14} color={tx.assigned_to ? "var(--cyan-neon)" : "var(--text-muted)"} />
                <span style={{ color: tx.assigned_to ? "var(--cyan-neon)" : "var(--text-muted)", fontWeight: 600 }}>
                  {tx.assigned_to || "Unassigned"}
                </span>
              </div>
              <span style={{ fontSize: "10px" }}>
                {tx.created_at ? new Date(tx.created_at).toLocaleTimeString() : ""}
              </span>
            </div>

            {/* Quick Action Button */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "14px" }}>
              <button
                className="btn secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTx(tx);
                }}
                style={{ fontSize: "11px", padding: "8px" }}
              >
                Inspect Dossier →
              </button>
              {tx.status !== "resolved" ? (
                <button
                  className="btn secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    resolveQuick(tx.id);
                  }}
                  style={{ fontSize: "11px", padding: "8px", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.3)" }}
                >
                  <CheckCircle2 size={13} /> Resolve
                </button>
              ) : (
                <span style={{ fontSize: "11px", color: "var(--risk-safe)", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                  <ShieldCheck size={14} /> Resolved
                </span>
              )}
            </div>
          </motion.article>
        ))}
      </div>

      {!filteredCases.length && (
        <div style={{ padding: "80px", textAlign: "center", border: "1px dashed var(--border-medium)", borderRadius: "14px", marginTop: "20px", color: "var(--text-muted)" }}>
          <h3>No cases found</h3>
          <p style={{ fontSize: "12px", marginTop: "6px" }}>
            All cases in this category have been triaged or no anomalies match the search criteria.
          </p>
        </div>
      )}

      {/* Investigation Drawer */}
      <InvestigationDrawer
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onUpdate={(updated) => {
          setSelectedTx(updated);
          loadCases();
        }}
      />
    </motion.div>
  );
}
