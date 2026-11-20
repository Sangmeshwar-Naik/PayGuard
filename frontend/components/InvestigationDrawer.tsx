"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Clock,
  Send,
  Cpu,
  Smartphone,
  Globe,
  CreditCard,
  AlertTriangle,
  FileText,
  History,
  CheckCircle,
  Ban,
  User,
} from "lucide-react";
import { Tx, AuditLog, Investigator, api } from "@/lib/api";

interface Props {
  transaction: Tx | null;
  onClose: () => void;
  onUpdate: (updated: Tx) => void;
}

export default function InvestigationDrawer({ transaction, onClose, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "audit">("overview");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [selectedInvestigator, setSelectedInvestigator] = useState("");
  const [newNote, setNewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!transaction) return;
    loadAuditLogs(transaction.id);
    loadInvestigators();
    setSelectedInvestigator(transaction.assigned_to || "");
  }, [transaction?.id]);

  async function loadAuditLogs(id: number) {
    try {
      const logs = await api<AuditLog[]>(`/transactions/${id}/audit`);
      setAuditLogs(logs);
    } catch {
      // ignore
    }
  }

  async function loadInvestigators() {
    try {
      const list = await api<Investigator[]>("/investigators");
      setInvestigators(list);
    } catch {
      // fallback
      setInvestigators([
        { id: "inv_1", name: "Sarah Chen", role: "Senior Fraud Analyst", avatar: "SC" },
        { id: "inv_2", name: "Marcus Vance", role: "Risk Ops Lead", avatar: "MV" },
        { id: "inv_3", name: "Elena Rostova", role: "Financial Crime Analyst", avatar: "ER" },
        { id: "inv_4", name: "David Kalu", role: "AML Specialist", avatar: "DK" },
      ]);
    }
  }

  async function handleAssign(name: string) {
    if (!transaction) return;
    setBusy(true);
    setActionError("");
    try {
      const updated = await api<Tx>(`/transactions/${transaction.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ investigator: name, actor: "Security Operator" }),
      });
      setSelectedInvestigator(name);
      onUpdate(updated);
      await loadAuditLogs(transaction.id);
    } catch (e: any) {
      setActionError(e.message || "Failed to assign case");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(status: string) {
    if (!transaction) return;
    setBusy(true);
    setActionError("");
    try {
      const updated = await api<Tx>(`/transactions/${transaction.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          notes: `Status changed to ${status.toUpperCase()} during operator review.`,
          actor: "Security Operator",
        }),
      });
      onUpdate(updated);
      await loadAuditLogs(transaction.id);
    } catch (e: any) {
      setActionError(e.message || "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction || !newNote.trim()) return;
    setBusy(true);
    setActionError("");
    try {
      const updated = await api<Tx>(`/transactions/${transaction.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: newNote.trim(), actor: "Security Operator" }),
      });
      setNewNote("");
      onUpdate(updated);
      await loadAuditLogs(transaction.id);
    } catch (e: any) {
      setActionError(e.message || "Failed to add note");
    } finally {
      setBusy(false);
    }
  }

  if (!transaction) return null;

  return (
    <AnimatePresence>
      <div className="drawer-backdrop" onClick={onClose}>
        <motion.div
          className="drawer"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 240 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="drawer-header">
            <div>
              <span className="eyebrow">CASE DOSSIER</span>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#fff", margin: "4px 0" }}>
                {transaction.external_id}
              </h2>
              <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {transaction.merchant} · {transaction.card_token}
              </p>
            </div>
            <button className="top-action-btn" onClick={onClose} aria-label="Close drawer">
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)", padding: "0 24px", background: "rgba(0,0,0,0.2)" }}>
            {[
              { id: "overview", label: "Overview & Signals", icon: ShieldAlert },
              { id: "notes", label: "Case Notes", icon: FileText },
              { id: "audit", label: `Audit Trail (${auditLogs.length})`, icon: History },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 16px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: isActive ? "var(--cyan-neon)" : "var(--text-secondary)",
                    borderBottom: isActive ? "2px solid var(--cyan-neon)" : "2px solid transparent",
                    background: "none",
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {actionError && (
            <div style={{ margin: "16px 24px 0", padding: "10px 14px", background: "var(--risk-danger-bg)", border: "1px solid var(--risk-danger-border)", borderRadius: "8px", color: "#fca5a5", fontSize: "11px" }}>
              {actionError}
            </div>
          )}

          {/* Body */}
          <div className="drawer-body">
            {activeTab === "overview" && (
              <>
                {/* Status & Risk Summary Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px",
                    background: "linear-gradient(145deg, rgba(16,22,34,0.9), rgba(10,14,22,0.9))",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "12px",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Transaction Amount</span>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#fff", fontFamily: "JetBrains Mono" }}>
                      ${transaction.amount.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Risk Assessment</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                      <span className={`status ${transaction.status}`}>{transaction.status}</span>
                      <span
                        style={{
                          fontSize: "16px",
                          fontWeight: 800,
                          fontFamily: "JetBrains Mono",
                          color: transaction.risk_score >= 70 ? "var(--risk-danger)" : transaction.risk_score >= 40 ? "var(--risk-warning)" : "var(--risk-safe)",
                        }}
                      >
                        {transaction.risk_score.toFixed(1)} / 100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Investigator Assignment Control */}
                <div className="drawer-section">
                  <div className="drawer-section-title">Case Custody & Assignment</div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "10px",
                      padding: "12px 16px",
                    }}
                  >
                    <div className="avatar-circle" style={{ width: "38px", height: "38px" }}>
                      <UserCheck size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>ASSIGNED INVESTIGATOR</span>
                      <select
                        value={selectedInvestigator}
                        onChange={(e) => handleAssign(e.target.value)}
                        disabled={busy}
                        style={{
                          display: "block",
                          width: "100%",
                          background: "none",
                          color: selectedInvestigator ? "#fff" : "var(--text-muted)",
                          fontSize: "13px",
                          fontWeight: 700,
                          marginTop: "2px",
                          cursor: "pointer",
                        }}
                      >
                        <option value="" style={{ background: "#0e1522", color: "#888" }}>
                          -- Unassigned (Click to Assign) --
                        </option>
                        {investigators.map((inv) => (
                          <option key={inv.id} value={inv.name} style={{ background: "#0e1522", color: "#fff" }}>
                            {inv.name} ({inv.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quick Decision Action Buttons */}
                <div className="drawer-section">
                  <div className="drawer-section-title">Operator Actions</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                    <button
                      className="btn secondary"
                      onClick={() => handleStatusChange("approved")}
                      disabled={busy || transaction.status === "approved"}
                      style={{ color: "#34d399", borderColor: "rgba(16, 185, 129, 0.3)" }}
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => handleStatusChange("resolved")}
                      disabled={busy || transaction.status === "resolved"}
                      style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}
                    >
                      <ShieldCheck size={14} /> Resolve
                    </button>
                    <button
                      className="btn danger"
                      onClick={() => handleStatusChange("blocked")}
                      disabled={busy || transaction.status === "blocked"}
                    >
                      <Ban size={14} /> Block Card
                    </button>
                  </div>
                </div>

                {/* Risk Breakdown: Model vs Heuristics */}
                <div className="drawer-section">
                  <div className="drawer-section-title">Risk Engine Decomposition</div>
                  <div className="drawer-grid" style={{ marginBottom: "12px" }}>
                    <div className="info-tile">
                      <span>ML Model ({transaction.model_version || "Active"})</span>
                      <b style={{ color: "var(--cyan-neon)" }}>
                        {typeof transaction.model_score === "number" ? `${transaction.model_score.toFixed(1)} / 100` : "—"}
                      </b>
                    </div>
                    <div className="info-tile">
                      <span>Deterministic Rules Score</span>
                      <b style={{ color: "var(--risk-warning)" }}>
                        {typeof transaction.rule_score === "number" ? `${transaction.rule_score.toFixed(1)} / 100` : "—"}
                      </b>
                    </div>
                  </div>

                  <div className="drawer-section-title" style={{ marginTop: "16px" }}>
                    Triggered Risk Signals & Attribution
                  </div>
                  {transaction.risk_factors && transaction.risk_factors.length > 0 ? (
                    transaction.risk_factors.map((factor, idx) => (
                      <div key={idx} className="factor-pill">
                        <AlertTriangle size={14} style={{ color: "var(--risk-warning)", flexShrink: 0 }} />
                        <span>{factor}</span>
                      </div>
                    ))
                  ) : (
                    <div className="factor-pill" style={{ background: "var(--risk-safe-bg)", borderColor: "var(--risk-safe-border)", color: "#a7f3d0" }}>
                      <ShieldCheck size={14} style={{ color: "var(--risk-safe)" }} />
                      <span>No adverse fraud patterns triggered</span>
                    </div>
                  )}
                </div>

                {/* Telemetry & Device Fingerprints */}
                <div className="drawer-section">
                  <div className="drawer-section-title">Telemetry & Infrastructure</div>
                  <div className="drawer-grid">
                    <div className="info-tile">
                      <span>Client IP Address</span>
                      <b style={{ fontFamily: "JetBrains Mono" }}>{transaction.client_ip || "192.168.1.1"}</b>
                    </div>
                    <div className="info-tile">
                      <span>Device Fingerprint</span>
                      <b style={{ fontFamily: "JetBrains Mono" }}>{transaction.device_id || "dev_untracked"}</b>
                    </div>
                    <div className="info-tile">
                      <span>Channel / Rail</span>
                      <b>{transaction.channel.toUpperCase()} · {transaction.payment_method?.toUpperCase()}</b>
                    </div>
                    <div className="info-tile">
                      <span>Corridor / Merchant</span>
                      <b>{transaction.country} · {transaction.category}</b>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "notes" && (
              <div>
                <form onSubmit={handleAddNote} style={{ marginBottom: "20px" }}>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter observation notes, verified phone confirmation, chargeback risk assessment..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                      resize: "none",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                    <button type="submit" className="btn primary" disabled={busy || !newNote.trim()}>
                      <Send size={13} /> {busy ? "Saving..." : "Add Case Note"}
                    </button>
                  </div>
                </form>

                <div className="drawer-section-title">Notes Log</div>
                {transaction.investigation_notes ? (
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      fontSize: "11px",
                      lineHeight: "1.6",
                      color: "var(--text-secondary)",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "14px",
                    }}
                  >
                    {transaction.investigation_notes}
                  </div>
                ) : (
                  <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "11px" }}>
                    No investigation notes recorded yet.
                  </div>
                )}
              </div>
            )}

            {activeTab === "audit" && (
              <div>
                <div className="drawer-section-title">Chain of Custody & Audit History</div>
                <div className="audit-timeline">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="audit-entry">
                      <div className="audit-node" />
                      <div className="audit-meta">
                        <b>{log.actor}</b> · {new Date(log.created_at).toLocaleString()}
                      </div>
                      <div className="audit-text">
                        <span style={{ fontWeight: 700, color: "var(--cyan-bright)", marginRight: "6px" }}>
                          [{log.action}]
                        </span>
                        {log.details}
                      </div>
                    </div>
                  ))}
                  {!auditLogs.length && (
                    <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "11px" }}>
                      No audit history entries found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
