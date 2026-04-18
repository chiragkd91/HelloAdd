"use client";

import type { BudgetApi } from "@/types/budget";
import { useCallback, useEffect, useState } from "react";

export type SaveBudgetPayload = {
  month: number;
  year: number;
  totalBudget: number;
  platforms: Record<string, { allocated: number; spent: number }>;
};

export function useBudget(month: number, year: number) {
  const [budget, setBudget] = useState<BudgetApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
      });
      const r = await fetch(`/api/budget?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (r.status === 401) {
        setBudget(null);
        setError("Sign in required");
        return;
      }
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(typeof j.error === "string" ? j.error : "Failed to load budget");
        setBudget(null);
        return;
      }
      const data = (await r.json()) as BudgetApi;
      setBudget(data);
    } catch {
      setError("Network error");
      setBudget(null);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (body: SaveBudgetPayload) => {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/budget", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.status === 401) {
        setError("Sign in required");
        return false;
      }
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(typeof j.error === "string" ? j.error : "Save failed");
        return false;
      }
      const data = (await r.json()) as BudgetApi;
      setBudget(data);
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { budget, isLoading, error, saving, refresh, save };
}
