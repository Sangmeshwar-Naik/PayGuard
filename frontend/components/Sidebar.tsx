"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  ArrowLeftRight,
  ScanSearch,
  ChartNoAxesCombined,
  Cpu,
  Settings,
  Shield,
  Activity,
  Layers,
} from "lucide-react";

const navItems = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Transactions", href: "/transactions", icon: ArrowLeftRight, liveBadge: true },
  { name: "Investigations", href: "/investigations", icon: ScanSearch },
  { name: "Analytics", href: "/analytics", icon: ChartNoAxesCombined },
  { name: "Model Governance", href: "/model", icon: Cpu },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/" className="logo">
        <div className="logo-badge">
          <Shield size={20} />
        </div>
        <b>
          Pay<span>Guard</span>
        </b>
        <span className="logo-tag">PROD</span>
      </Link>

      <div className="workspace-chip">
        <div className="workspace-icon">
          <Layers size={16} />
        </div>
        <div className="workspace-info">
          <b>Risk Operations</b>
          <small>Tier-1 Fraud Defense</small>
        </div>
      </div>

      <small className="nav-caption">Surveillance & Defense</small>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? "active" : ""}`}
          >
            <Icon size={17} />
            <span>{item.name}</span>
            {item.liveBadge && <em>LIVE</em>}
          </Link>
        );
      })}

      <div className="sidebar-bottom">
        <div className="status-card">
          <div className="status-card-header">
            <span className="pulse-dot" />
            <span>Surveillance Online</span>
          </div>
          <small>WS Streaming · ML Arbiter Active</small>
        </div>

        <div className="user-profile">
          <div className="avatar-circle">SO</div>
          <div className="user-info">
            <b>Security Operator</b>
            <small>Lead Risk Specialist</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
