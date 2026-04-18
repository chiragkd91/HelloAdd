"use client";

import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import toast from "react-hot-toast";
import { useCallback, useEffect, useState } from "react";

type BudgetSuggestion = {
  suggestion: string;
  action: string;
  expectedImpact: string;
  priority: "high" | "medium" | "low";
};

function priorityBadge(p: BudgetSuggestion["priority"]) {
  if (p === "high") return "bg-red-100 text-red-800";
  if (p === "medium") return "bg-amber-100 text-amber-900";
  return "bg-neutral-100 text-neutral-700";
}

export function AIInsightsCard() {
  const [items, setItems] = useState<BudgetSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/ai/suggestions", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(typeof j.error === "string" ? j.error : "Could not load suggestions");
        setItems([]);
        return;
      }
      const data = (await r.json()) as { suggestions?: BudgetSuggestion[] };
      setItems(data.suggestions ?? []);
    } catch {
      setError("Network error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">AI insights</h2>
          <p className="text-sm text-neutral-600">
            Budget ideas from your live campaigns (Claude via Hello Add when configured; rule-based fallback
            otherwise).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className={`${buttonVariantStyles.secondary} px-4 py-2 text-sm disabled:opacity-60`}
        >
          {loading ? "Refreshing…" : "Refresh insights"}
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm text-amber-800">{error}</p>
      )}

      {loading && !items.length && !error ? (
        <p className="mt-6 text-sm text-neutral-600">Loading suggestions…</p>
      ) : !items.length && !error ? (
        <p className="mt-6 text-sm text-neutral-600">
          No suggestions yet — add live campaigns with metrics or connect platforms.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.slice(0, 3).map((s, i) => (
            <li
              key={`${s.suggestion.slice(0, 40)}-${i}`}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${priorityBadge(s.priority)}`}
                >
                  {s.priority}
                </span>
                <span className="text-sm font-semibold text-neutral-900">{s.suggestion}</span>
              </div>
              <p className="mt-2 text-xs text-neutral-600">{s.action}</p>
              <p className="mt-1 text-xs text-neutral-600">{s.expectedImpact}</p>
              <button
                type="button"
                className={`${buttonVariantStyles.primary} mt-3 px-3 py-1.5 text-xs`}
                onClick={() => {
                  toast.success("Review this with your team before changing budgets in-platform.");
                }}
              >
                Apply
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
