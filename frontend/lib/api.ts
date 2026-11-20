const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const h = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    h.set("Content-Type", "application/json");
  }
  const r = await fetch(API + path, { ...options, headers: h, cache: "no-store" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(d.detail || `API request failed with status ${r.status}`);
  }
  return d as T;
}

export function getWsUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";
  const wsProto = base.startsWith("https") ? "wss" : "ws";
  const cleanBase = base.replace(/^https?:\/\//, "");
  return `${wsProto}://${cleanBase}/ws`;
}

export interface Tx {
  id: number;
  external_id: string;
  card_token: string;
  merchant: string;
  category: string;
  amount: number;
  country: string;
  channel: string;
  risk_score: number;
  risk_level: "low" | "medium" | "high";
  status: "approved" | "flagged" | "review" | "blocked" | "resolved";
  reason: string;
  created_at: string | null;

  assigned_to?: string | null;
  assigned_at?: string | null;
  investigation_notes?: string;
  resolved_by?: string | null;
  resolved_at?: string | null;
  risk_factors?: string[];
  model_version?: string | null;
  model_score?: number | null;
  rule_score?: number | null;
  device_id?: string | null;
  client_ip?: string | null;
  payment_method?: string | null;
}

export interface PaginatedTx {
  items: Tx[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  summary: {
    showing_from: number;
    showing_to: number;
  };
}

export interface AuditLog {
  id: number;
  transaction_id: number;
  action: string;
  actor: string;
  details: string;
  created_at: string;
}

export interface Investigator {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface ConfusionMatrix {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
  total: number;
  accuracy: number;
  false_positive_rate: number;
  false_negative_rate: number;
}

export interface CurvePoint {
  x: number;
  y: number;
}

export interface ModelRecord {
  id: string;
  name: string;
  version: string;
  type: string;
  description: string;
  artifact_file: string;
  fit_time_seconds: number;
  inference_latency_ms: number;
  metrics: {
    precision: number;
    recall: number;
    f1_score: number;
    pr_auc: number;
    roc_auc: number;
    confusion_matrix: ConfusionMatrix;
  };
  hyperparameters: Record<string, any>;
  top_features: Array<{ feature: string; importance: number; sign?: string }>;
  curves: {
    precision_recall: CurvePoint[];
    roc: CurvePoint[];
  };
}

export interface ModelRegistry {
  dataset: {
    name: string;
    total_records: number;
    features_count: number;
    fraud_count: number;
    fraud_rate: number;
    train_size: number;
    test_size: number;
    features: string[];
  };
  models: Record<string, ModelRecord>;
  active_model: string;
  trained_at: string;
}

export interface ModelMonitoring {
  total_inferences: number;
  avg_latency_ms: number;
  score_distribution: Array<{ range: string; count: number }>;
  drift_status: "NORMAL" | "WARNING" | "DRIFT_DETECTED";
  psi_score: number;
  active_model: string;
}

export interface Overview {
  total_transactions: number;
  flagged_transactions: number;
  high_risk: number;
  blocked_transactions: number;
  open_investigations: number;
  assigned_investigations: number;
  total_volume: number;
  flag_rate: number;
  active_model: {
    version: string;
    name: string;
    pr_auc: number;
    f1_score: number;
    recall: number;
    precision: number;
  };
  recent: Tx[];
}
