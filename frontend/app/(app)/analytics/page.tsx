"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ChartNoAxesCombined,
  TrendingUp,
  Globe,
  Smartphone,
  ShieldAlert,
  RefreshCw,
  PieChart,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { api } from "@/lib/api";

interface AnalyticsData {
  total_count: number;
  categories: Array<{ category: string; count: number; volume: number; flagged: number }>;
  countries: Array<{ country: string; count: number; volume: number; flagged: number }>;
  channels: Array<{ channel: string; count: number; volume: number; flagged: number }>;
  risk_distribution: Array<{ name: string; value: number; color: string }>;
  status_distribution: Array<{ name: string; value: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<AnalyticsData>("/analytics");
      setData(res);
    } catch (e: any) {
      setError(e.message || "Failed to load risk analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

  return (
    <motion.div
      className="page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="heading">
        <div>
          <span className="eyebrow">PORTFOLIO INTELLIGENCE</span>
          <h1>Risk Analytics</h1>
          <p>Multi-corridor vulnerability mapping, merchant category exposure, and channel anomaly rates.</p>
        </div>

        <div className="head-actions">
          <button className="btn secondary" onClick={loadAnalytics}>
            <RefreshCw size={15} /> Refresh Analytics
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Grid: Category Exposure and Risk Breakdown */}
      <div className="dash-grid" style={{ marginBottom: "24px" }}>
        {/* Category Exposure Bar Chart */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Merchant Category Exposure & Flags</h3>
              <p>Total transaction volume vs. flagged volume per vertical</p>
            </div>
            <BarChart3 size={18} color="var(--cyan-bright)" />
          </div>

          <div className="chart-wrap" style={{ height: "280px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.categories || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                <XAxis dataKey="category" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} fontFamily="JetBrains Mono" />
                <Tooltip
                  contentStyle={{
                    background: "#0c121e",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(val: any, name: any) => [
                    name === "volume" ? `$${Number(val).toLocaleString()}` : val,
                    name === "volume" ? "Total Volume" : name === "flagged" ? "Flagged Events" : "Total Count",
                  ]}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="count" />
                <Bar dataKey="flagged" fill="#ef4444" radius={[4, 4, 0, 0]} name="flagged" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Risk Distribution Donut */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Risk Severity Breakdown</h3>
              <p>Fleet-wide distribution by risk tier</p>
            </div>
            <PieChart size={18} color="var(--cyan-bright)" />
          </div>

          <div style={{ height: "240px", display: "grid", placeItems: "center" }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={data?.risk_distribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data?.risk_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0c121e",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Legend
                  formatter={(value) => <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>{value}</span>}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Corridor & Channel Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Country Corridors */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Geographic Corridor Vulnerability</h3>
              <p>Transaction concentration and anomaly rate by country</p>
            </div>
            <Globe size={18} color="var(--cyan-bright)" />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>COUNTRY</th>
                  <th>TRANSACTIONS</th>
                  <th>VOLUME</th>
                  <th>FLAGGED</th>
                </tr>
              </thead>
              <tbody>
                {data?.countries.map((c) => (
                  <tr key={c.country}>
                    <td>
                      <b style={{ fontFamily: "JetBrains Mono" }}>{c.country}</b>
                    </td>
                    <td>{c.count.toLocaleString()}</td>
                    <td className="amount">${c.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td>
                      <span className={`status ${c.flagged > 0 ? "flagged" : "approved"}`}>
                        {c.flagged} flagged
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Channel Breakdown */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Payment Rail & Channel Breakdown</h3>
              <p>In-store POS vs. Online E-Commerce vs. Mobile</p>
            </div>
            <Smartphone size={18} color="var(--cyan-bright)" />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CHANNEL</th>
                  <th>TRANSACTIONS</th>
                  <th>VOLUME</th>
                  <th>FLAG RATE</th>
                </tr>
              </thead>
              <tbody>
                {data?.channels.map((ch) => {
                  const rate = ch.count > 0 ? ((ch.flagged / ch.count) * 100).toFixed(1) : "0";
                  return (
                    <tr key={ch.channel}>
                      <td>
                        <b style={{ textTransform: "uppercase" }}>{ch.channel}</b>
                      </td>
                      <td>{ch.count.toLocaleString()}</td>
                      <td className="amount">${ch.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td>
                        <span style={{ color: Number(rate) > 20 ? "var(--risk-danger)" : "var(--risk-safe)", fontWeight: 700 }}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
