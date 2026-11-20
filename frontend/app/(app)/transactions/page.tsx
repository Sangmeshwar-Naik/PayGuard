"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  Filter,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  CreditCard,
} from "lucide-react";
import { api, Tx, PaginatedTx } from "@/lib/api";
import { useWebSocketFeed } from "@/lib/useWebSocket";
import InvestigationDrawer from "@/components/InvestigationDrawer";

export default function TransactionsPage() {
  const [data, setData] = useState<PaginatedTx | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (statusFilter !== "all") params.append("status", statusFilter);
      if (riskFilter !== "all") params.append("risk_level", riskFilter);
      if (channelFilter !== "all") params.append("channel", channelFilter);
      if (assignedFilter !== "all") params.append("assigned_to", assignedFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await api<PaginatedTx>(`/transactions?${params.toString()}`);
      setData(res);
    } catch (e: any) {
      setError(e.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, riskFilter, channelFilter, assignedFilter, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Real-time WebSocket listener
  useWebSocketFeed({
    onNewTransaction: (tx) => {
      // If we are on page 1 and no specific restrictive filters, prepend into items
      if (page === 1) {
        setData((prev) => {
          if (!prev) return prev;
          const exists = prev.items.some((i) => i.id === tx.id);
          if (exists) return prev;
          return {
            ...prev,
            total: prev.total + 1,
            items: [tx, ...prev.items.slice(0, pageSize - 1)],
          };
        });
      }
    },
    onTransactionUpdated: (tx) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) => (i.id === tx.id ? tx : i)),
        };
      });
      if (selectedTx?.id === tx.id) {
        setSelectedTx(tx);
      }
    },
  });

  function handleSort(col: string) {
    if (sortBy === col) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
    setPage(1);
  }

  function exportCSV() {
    if (!data?.items.length) return;
    const headers = ["ID", "ExternalID", "Merchant", "Category", "Amount", "Country", "Channel", "RiskScore", "RiskLevel", "Status", "AssignedTo", "CreatedAt"];
    const rows = data.items.map((t) => [
      t.id,
      t.external_id,
      `"${t.merchant}"`,
      t.category,
      t.amount,
      t.country,
      t.channel,
      t.risk_score,
      t.risk_level,
      t.status,
      `"${t.assigned_to || ""}"`,
      `"${t.created_at || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payguard_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <span className="eyebrow">EVENT STREAM & LEDGER</span>
          <h1>Transactions</h1>
          <p>Multi-dimensional query engine with server-side pagination and real-time streaming.</p>
        </div>

        <div className="head-actions">
          <button className="btn secondary" onClick={exportCSV}>
            <Download size={15} /> Export CSV
          </button>
          <button className="btn secondary" onClick={fetchTransactions}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      <section className="panel">
        {/* Filter bar */}
        <div className="toolbar">
          {/* Status filters */}
          <div className="filters-group">
            {["all", "approved", "flagged", "review", "blocked", "resolved"].map((s) => (
              <button
                key={s}
                className={`filter-btn ${statusFilter === s ? "selected" : ""}`}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="search-input-wrap">
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search ID, Merchant, Card, Country..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Secondary Filters (Risk level, Channel, Assigned) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 0 16px",
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={13} /> REFINE:
          </span>

          {/* Risk Level */}
          <select
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "6px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="all" style={{ background: "#0e1522" }}>All Risk Levels</option>
            <option value="low" style={{ background: "#0e1522" }}>Low Risk (0-39)</option>
            <option value="medium" style={{ background: "#0e1522" }}>Medium Risk (40-69)</option>
            <option value="high" style={{ background: "#0e1522" }}>High Risk (70-100)</option>
          </select>

          {/* Channel */}
          <select
            value={channelFilter}
            onChange={(e) => {
              setChannelFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "6px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="all" style={{ background: "#0e1522" }}>All Channels</option>
            <option value="online" style={{ background: "#0e1522" }}>Online / E-Commerce</option>
            <option value="pos" style={{ background: "#0e1522" }}>In-Store POS</option>
            <option value="mobile" style={{ background: "#0e1522" }}>Mobile App</option>
          </select>

          {/* Assigned */}
          <select
            value={assignedFilter}
            onChange={(e) => {
              setAssignedFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "6px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="all" style={{ background: "#0e1522" }}>All Investigators</option>
            <option value="unassigned" style={{ background: "#0e1522" }}>Unassigned Only</option>
            <option value="Sarah Chen" style={{ background: "#0e1522" }}>Sarah Chen</option>
            <option value="Marcus Vance" style={{ background: "#0e1522" }}>Marcus Vance</option>
            <option value="Elena Rostova" style={{ background: "#0e1522" }}>Elena Rostova</option>
            <option value="David Kalu" style={{ background: "#0e1522" }}>David Kalu</option>
          </select>

          {/* Page size */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
            <span>Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{
                padding: "4px 8px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                fontSize: "11px",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <option value={15} style={{ background: "#0e1522" }}>15</option>
              <option value={25} style={{ background: "#0e1522" }}>25</option>
              <option value={50} style={{ background: "#0e1522" }}>50</option>
              <option value={100} style={{ background: "#0e1522" }}>100</option>
            </select>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Ledger Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort("id")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    TRANSACTION ID
                    <ArrowUpDown size={12} color={sortBy === "id" ? "var(--cyan-bright)" : "var(--text-muted)"} />
                  </div>
                </th>
                <th>MERCHANT / CATEGORY</th>
                <th>CORRIDOR</th>
                <th>CHANNEL</th>
                <th onClick={() => handleSort("amount")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    AMOUNT
                    <ArrowUpDown size={12} color={sortBy === "amount" ? "var(--cyan-bright)" : "var(--text-muted)"} />
                  </div>
                </th>
                <th onClick={() => handleSort("risk_score")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    RISK SCORE
                    <ArrowUpDown size={12} color={sortBy === "risk_score" ? "var(--cyan-bright)" : "var(--text-muted)"} />
                  </div>
                </th>
                <th>STATUS</th>
                <th>INVESTIGATOR</th>
                <th>TIMESTAMP</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((tx) => (
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
                    <small>{tx.category.toUpperCase()}</small>
                  </td>
                  <td>
                    <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#fff" }}>
                      {tx.country}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "11px", textTransform: "uppercase" }}>{tx.channel}</span>
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
                  <td>
                    <small>{tx.created_at ? new Date(tx.created_at).toLocaleTimeString() : "—"}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && !data?.items.length && (
            <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
              No transactions match the selected filter criteria.
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {data && (
          <div className="pagination">
            <div>
              Showing <b>{data.summary.showing_from}</b> to <b>{data.summary.showing_to}</b> of{" "}
              <b>{data.total.toLocaleString()}</b> transactions
            </div>

            <div className="pagination-actions">
              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span style={{ padding: "0 8px", fontWeight: 700, color: "#fff" }}>
                Page {page} of {data.total_pages}
              </span>

              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page >= data.total_pages}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Investigation Drawer */}
      <InvestigationDrawer
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onUpdate={(updated) => {
          setSelectedTx(updated);
          fetchTransactions();
        }}
      />
    </motion.div>
  );
}
