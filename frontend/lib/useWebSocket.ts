"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getWsUrl, Tx, AuditLog } from "./api";

export interface WebSocketEvent {
  type: "CONNECTION_ESTABLISHED" | "NEW_TRANSACTION" | "TRANSACTION_UPDATED" | "AUDIT_LOG_CREATED" | "MODEL_VERSION_CHANGED" | "PONG";
  data?: any;
  message?: string;
  active_clients?: number;
}

export function useWebSocketFeed(options?: {
  onNewTransaction?: (tx: Tx) => void;
  onTransactionUpdated?: (tx: Tx) => void;
  onAuditLog?: (log: AuditLog) => void;
  onModelChanged?: (version: string) => void;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeClients, setActiveClients] = useState(1);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep callback refs fresh
  const onNewTxRef = useRef(options?.onNewTransaction);
  const onUpdateTxRef = useRef(options?.onTransactionUpdated);
  const onAuditRef = useRef(options?.onAuditLog);
  const onModelRef = useRef(options?.onModelChanged);

  useEffect(() => {
    onNewTxRef.current = options?.onNewTransaction;
    onUpdateTxRef.current = options?.onTransactionUpdated;
    onAuditRef.current = options?.onAuditLog;
    onModelRef.current = options?.onModelChanged;
  });

  const connect = useCallback(() => {
    try {
      const url = getWsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Start ping heartbeat every 15s
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        setLastEventTime(new Date());
        try {
          const payload: WebSocketEvent = JSON.parse(event.data);
          if (payload.type === "CONNECTION_ESTABLISHED") {
            if (payload.active_clients) setActiveClients(payload.active_clients);
          } else if (payload.type === "NEW_TRANSACTION" && payload.data) {
            onNewTxRef.current?.(payload.data as Tx);
          } else if (payload.type === "TRANSACTION_UPDATED" && payload.data) {
            onUpdateTxRef.current?.(payload.data as Tx);
          } else if (payload.type === "AUDIT_LOG_CREATED" && payload.data) {
            onAuditRef.current?.(payload.data as AuditLog);
          } else if (payload.type === "MODEL_VERSION_CHANGED" && payload.data) {
            onModelRef.current?.(payload.data.active_model);
          }
        } catch {
          // Plain text pong
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Reconnect after 3s
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      reconnectTimeoutRef.current = setTimeout(connect, 4000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  }, []);

  return { isConnected, activeClients, lastEventTime, send };
}
