"use client";

import type { ReportTypeApi } from "@/lib/reports";
import { useCallback, useState } from "react";

export type GenerateReportResult = {
  reportId: string;
  status: "ready" | "queued" | string;
  organizationId: string;
  reportType: string;
  message?: string;
};

export function useReportGenerate() {
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const generate = useCallback(
    async (params: {
      reportType: ReportTypeApi;
      dateFrom?: string;
      dateTo?: string;
    }) => {
      setPending(true);
      setLastError(null);
      try {
        const r = await fetch("/api/reports/generate", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportType: params.reportType,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
          }),
        });
        if (r.status === 401) {
          setLastError("Sign in required");
          return null;
        }
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          const msg = typeof j.error === "string" ? j.error : "Generation failed";
          setLastError(msg);
          return null;
        }
        return (await r.json()) as GenerateReportResult;
      } catch {
        setLastError("Network error");
        return null;
      } finally {
        setPending(false);
      }
    },
    []
  );

  return { generate, pending, lastError, clearError: () => setLastError(null) };
}
