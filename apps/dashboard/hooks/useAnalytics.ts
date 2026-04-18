"use client";

import type { AnalyticsResponse } from "@/types/analytics";
import { useCallback, useEffect, useState } from "react";

export type UseAnalyticsOptions = {
  /** Single platform filter (Mongo enum e.g. GOOGLE). Omit for all. */
  platform?: string;
  /** Rolling window for daily series (1–90). */
  days?: number;
};

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const { platform, days = 30 } = options;
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("days", String(days));
      if (platform) params.set("platform", platform);

      const r = await fetch(`/api/analytics?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (r.status === 401) {
        setData(null);
        setError("Sign in required");
        return;
      }
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(typeof j.error === "string" ? j.error : "Failed to load analytics");
        setData(null);
        return;
      }
      setData((await r.json()) as AnalyticsResponse);
    } catch {
      setError("Network error");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [platform, days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
