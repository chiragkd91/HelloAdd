"use client";

import { useCallback, useEffect, useState } from "react";

export type ReportListItem = {
  id: string;
  reportType: string;
  status: string;
  dateFrom: string | null;
  dateTo: string | null;
  createdAt: string;
  errorMessage: string | null;
};

type ResponseShape = { items: ReportListItem[] };

export function useReportsList() {
  const [items, setItems] = useState<ReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/reports?limit=50", {
        credentials: "include",
        cache: "no-store",
      });
      if (r.status === 401) {
        setItems([]);
        setError("Sign in required");
        return;
      }
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(typeof j.error === "string" ? j.error : "Failed to load reports");
        setItems([]);
        return;
      }
      const data = (await r.json()) as ResponseShape;
      setItems(data.items ?? []);
    } catch {
      setError("Network error");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, isLoading, error, refresh };
}
