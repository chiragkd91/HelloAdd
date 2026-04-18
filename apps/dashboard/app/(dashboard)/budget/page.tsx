"use client";

import { BudgetPlatformRowsSkeleton } from "@/components/ui/DataSkeletons";
import { platformLabel } from "@/lib/campaignDisplay";
import {
  BUDGET_PLATFORM_COLORS,
  BUDGET_PLATFORM_ORDER,
  normalizePlatforms,
  platformsToJson,
  sumAllocated,
  sumSpent,
} from "@/lib/budgetUtils";
import type { PlatformBudgetNumbers } from "@/types/budget";
import { useBudget } from "@/hooks/useBudget";
import { useBudgetHistory } from "@/hooks/useBudgetHistory";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function burnDays(spent: number, totalBudget: number) {
  if (spent <= 0 || totalBudget <= 0) return "—";
  const daily = spent / 30;
  const remaining = Math.max(0, totalBudget - spent);
  const days = Math.round(remaining / daily);
  return String(days);
}

function sliderTone(pct: number) {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 80) return "bg-amber-400";
  return "bg-primary";
}

export default function BudgetPage() {
  const isMdUp = useMediaQuery("(min-width: 768px)");
  /** Defer calendar month/year to `useEffect` so server/client first paint match (avoids hydration mismatch). */
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    const d = new Date();
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  }, []);

  /** Placeholder month/year before effect runs — fixed so server and client HTML match. */
  const monthSafe = month ?? 1;
  const yearSafe = year ?? 2000;

  const { budget, isLoading, error, saving, refresh, save } = useBudget(monthSafe, yearSafe);
  const { points: historyPoints, loading: historyLoading } = useBudgetHistory(monthSafe, yearSafe);

  const [totalBudgetInput, setTotalBudgetInput] = useState(0);
  const [platformsState, setPlatformsState] = useState<Record<string, PlatformBudgetNumbers>>(() =>
    normalizePlatforms({})
  );

  useEffect(() => {
    if (!budget) return;
    setTotalBudgetInput(budget.totalBudget);
    setPlatformsState(normalizePlatforms(budget.platforms ?? {}));
  }, [budget]);

  const totalSpent = sumSpent(platformsState);
  const totalAllocated = sumAllocated(platformsState);
  const burn = burnDays(totalSpent, totalBudgetInput);

  const yearOptions = useMemo(() => {
    const y0 = yearSafe - 1;
    return Array.from({ length: 5 }, (_, i) => y0 + i);
  }, [yearSafe]);

  async function handleSave() {
    const ok = await save({
      month: monthSafe,
      year: yearSafe,
      totalBudget: totalBudgetInput,
      platforms: platformsToJson(platformsState),
    });
    if (ok) {
      /* success — state refreshed from response */
    }
  }

  function updateAllocated(key: string, allocated: number) {
    setPlatformsState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        allocated: Math.max(0, allocated),
        spent: Math.min(prev[key]?.spent ?? 0, Math.max(0, allocated)),
      },
    }));
  }

  function updateSpent(key: string, spent: number) {
    setPlatformsState((prev) => {
      const cap = prev[key]?.allocated ?? 0;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          spent: Math.max(0, Math.min(spent, cap || spent)),
        },
      };
    });
  }

  if (month === null || year === null) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Budget</h1>
          <p className="mt-1 text-sm text-neutral-600">Plan spend, track burn, and stay ahead of limits.</p>
        </div>
        <BudgetPlatformRowsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Budget</h1>
        <p className="mt-1 text-sm text-neutral-600">Plan spend, track burn, and stay ahead of limits.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error}
          <button type="button" className="ml-2 font-semibold text-primary underline" onClick={() => refresh()}>
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-neutral-600 sm:flex-initial">
          Month
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-neutral-600 sm:flex-initial">
          Year
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-neutral-600 sm:w-44 sm:flex-initial">
          Total budget (INR)
          <input
            type="number"
            min={0}
            value={totalBudgetInput || ""}
            onChange={(e) => setTotalBudgetInput(Number(e.target.value) || 0)}
            className="w-full max-w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm tabular-nums text-neutral-900 sm:w-44"
          />
        </label>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || isLoading}
          className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50 sm:w-auto"
        >
          {saving ? "Saving…" : "Save budget"}
        </button>
      </div>

      {totalAllocated > totalBudgetInput && totalBudgetInput > 0 && (
        <p className="text-sm text-amber-800">
          Platform allocations sum to ₹{totalAllocated.toLocaleString("en-IN")}, above total ₹
          {totalBudgetInput.toLocaleString("en-IN")}. Adjust caps or raise the total.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold text-neutral-900">Platform allocation</h2>
          <p className="mt-1 text-xs text-neutral-600">
            Set per-platform caps, then drag spend to simulate pacing (saved to MongoDB).
          </p>
          {isLoading ? (
            <BudgetPlatformRowsSkeleton />
          ) : (
            <ul className="mt-6 space-y-6">
              {BUDGET_PLATFORM_ORDER.map((key) => {
                const p = platformsState[key] ?? { allocated: 0, spent: 0 };
                const pct = p.allocated > 0 ? Math.min(100, Math.round((p.spent / p.allocated) * 100)) : 0;
                const color = BUDGET_PLATFORM_COLORS[key] ?? "#6845ab";
                return (
                  <li key={key}>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-semibold text-neutral-800">{platformLabel(key)}</span>
                      <label className="flex items-center gap-2 text-xs text-neutral-600">
                        Cap (₹)
                        <input
                          type="number"
                          min={0}
                          value={p.allocated || ""}
                          onChange={(e) => updateAllocated(key, Number(e.target.value) || 0)}
                          className="w-24 rounded-lg border border-neutral-200 px-2 py-1 tabular-nums"
                        />
                      </label>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs tabular-nums text-neutral-600">
                      <span>
                        Spent ₹{p.spent.toLocaleString("en-IN")} / ₹{p.allocated.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(p.allocated, 1)}
                      value={Math.min(p.spent, p.allocated || p.spent)}
                      onChange={(e) => updateSpent(key, Number(e.target.value))}
                      className="mt-2 w-full accent-primary"
                      style={{ accentColor: color }}
                    />
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={`h-full rounded-full transition-all ${sliderTone(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-neutral-600">
                      {pct >= 100 ? "At/over cap" : pct >= 80 ? "Approaching limit" : "Healthy"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-gradient-to-b from-primary/10 to-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Daily burn</h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-neutral-900">{burn} days</p>
          <p className="mt-2 text-sm text-neutral-600">
            Total spend across platforms:{" "}
            <strong>₹{totalSpent.toLocaleString("en-IN")}</strong> of ₹
            {totalBudgetInput.toLocaleString("en-IN")} planned.
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            At a rough 30-day linear pace, remaining budget may last about <strong>{burn}</strong> days.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Spend history (6 months)</h2>
        <p className="mt-1 text-xs text-neutral-600">Sum of platform <code className="rounded bg-neutral-100 px-1">spent</code> per month.</p>
        <div className="mt-4 w-full min-w-0">
          {historyLoading ? (
            <p className="py-12 text-center text-sm text-neutral-600">Loading chart…</p>
          ) : (
            <ResponsiveContainer width="100%" height={isMdUp ? 256 : 192}>
              <BarChart data={historyPoints} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [`₹${Number(value ?? 0).toLocaleString("en-IN")}`, "Spend"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5" }}
                />
                <Bar dataKey="amount" fill="#6845ab" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
