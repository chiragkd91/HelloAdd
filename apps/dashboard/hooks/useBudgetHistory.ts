"use client";

import { useEffect, useState } from "react";

function sumSpentFromApi(platforms: Record<string, unknown>): number {
  let s = 0;
  for (const v of Object.values(platforms)) {
    if (v && typeof v === "object" && v !== null && "spent" in v) {
      const sp = (v as { spent?: unknown }).spent;
      if (typeof sp === "number") s += sp;
    }
  }
  return s;
}

/** Loads 6 months of total platform spend (sum of `spent`) for the chart. */
export function useBudgetHistory(anchorMonth: number, anchorYear: number) {
  const [points, setPoints] = useState<{ month: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      const batch: { month: string; amount: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(anchorYear, anchorMonth - 1 - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        try {
          const r = await fetch(`/api/budget?month=${m}&year=${y}`, {
            credentials: "include",
            cache: "no-store",
          });
          if (!r.ok) continue;
          const j = (await r.json()) as { platforms?: Record<string, unknown> };
          const amount = sumSpentFromApi(j.platforms ?? {});
          batch.push({
            month: d.toLocaleDateString("en-IN", { month: "short" }),
            amount,
          });
        } catch {
          /* skip month */
        }
      }
      if (!cancelled) {
        setPoints(batch);
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [anchorMonth, anchorYear]);

  return { points, loading };
}
