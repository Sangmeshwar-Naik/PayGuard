"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { Bell, Search, Menu, Radio, ShieldCheck } from "lucide-react";
import { useWebSocketFeed } from "@/lib/useWebSocket";

const titleMap: Record<string, { title: string; eyebrow: string }> = {
  "/": { title: "Command Center", eyebrow: "REAL-TIME RISK OPERATIONS" },
  "/transactions": { title: "Transaction Ledger", eyebrow: "EVENT STREAM" },
  "/investigations": { title: "Case Management", eyebrow: "FRAUD INVESTIGATION" },
  "/analytics": { title: "Risk Analytics", eyebrow: "PORTFOLIO INTELLIGENCE" },
  "/model": { title: "Model Governance", eyebrow: "MLOPS & DRIFT MONITORING" },
  "/settings": { title: "System Configuration", eyebrow: "POLICY & THRESHOLDS" },
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const current = titleMap[pathname] || { title: "Overview", eyebrow: "PAYGUARD" };
  const { isConnected, activeClients } = useWebSocketFeed();

  return (
    <div className="layout">
      <div className="desktop">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)}>
          <div className="mobile-sidebar" onClick={(e) => e.stopPropagation()}>
            <Sidebar />
          </div>
        </div>
      )}

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="top-action-btn mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <Menu size={18} />
            </button>
            <div className="crumb">
              <span>{current.eyebrow}</span>
              <span>/</span>
              <b>{current.title}</b>
            </div>
          </div>

          <div className="topright">
            <div className={`ws-badge ${isConnected ? "" : "disconnected"}`}>
              <span className="pulse-dot" />
              <span>{isConnected ? `STREAM ACTIVE (${activeClients})` : "RECONNECTING"}</span>
            </div>

            <button className="top-action-btn">
              <Search size={14} />
              <span>Quick Find</span>
              <kbd>⌘ K</kbd>
            </button>

            <button className="top-action-btn" aria-label="Alerts">
              <Bell size={16} />
            </button>

            <div className="avatar-circle">SO</div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
