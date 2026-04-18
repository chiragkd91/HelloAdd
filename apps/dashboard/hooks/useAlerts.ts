"use client";

import type { ApiAlertItem } from "@/types/alert";
import { useCallback, useEffect, useState } from "react";

type AlertsListResponse = { items: ApiAlertItem[] };

export type UseAlertsOptions = {
  /** Only unread (open) alerts */
  unreadOnly?: boolean;
  max?: number;
};

export function useAlerts(options: UseAlertsOptions = {}) {
  const { unreadOnly = false, max = 200 } = options;
  const [alerts, setAlerts] = useState<ApiAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(max));
        if (unreadOnly) params.set("unread", "1");

        const r = await fetch(`/api/alerts?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (r.status === 401) {
          setAlerts([]);
          setError("Sign in required");
          return;
        }
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          setError(typeof j.error === "string" ? j.error : "Failed to load alerts");
          setAlerts([]);
          return;
        }
        const data = (await r.json()) as AlertsListResponse;
        setAlerts(data.items ?? []);
      } catch {
        setError("Network error");
        setAlerts([]);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [max, unreadOnly]
  );

  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    load(true);
  }, [load]);

  const markRead = useCallback(
    async (alertId: string, isRead: boolean) => {
      const r = await fetch("/api/alerts", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, isRead }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof j.error === "string" ? j.error : "Update failed");
      }
      await load(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("helloadd:alerts-changed"));
      }
    },
    [load]
  );

  return { alerts, isLoading, error, refresh, markRead };
}
