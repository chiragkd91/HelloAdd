"use client";

import { SummaryCardsSkeleton } from "@/components/ui/DataSkeletons";
import { useUnreadAlertCount } from "@/hooks/useUnreadAlertCount";
import { formatImpressions, formatInr } from "@/lib/campaignDisplay";
import { useEffect, useState } from "react";

type Summary = {
  campaignCount: number;
  impressions: number;
  clicks: number;
  budgetSpent: number;
  avgCtr: number;
};

export function KPIGrid() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const { unread } = useUnreadAlertCount();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/analytics?days=30", {
          credentials: "include",
          cache: "no-store",
        });
        if (!r.ok) {
          if (!cancelled) setSummary(null);
          return;
        }
        const data = (await r.json()) as { summary: Summary };
        if (!cancelled) setSummary(data.summary);
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const issueValue = unread == null ? "—" : String(unread);
  const issueDelta =
    unread == null ? "Loading…" : unread === 0 ? "All clear" : "Needs attention";
  const issueDeltaClass =
    unread == null ? "text-neutral-600" : unread > 0 ? "text-red-600" : "text-primary";

  const spendValue = loading ? "…" : summary ? formatInr(summary.budgetSpent) : "—";
  const impValue = loading ? "…" : summary ? formatImpressions(summary.impressions) : "—";
  const ctrValue = loading ? "…" : summary ? `${summary.avgCtr.toFixed(2)}%` : "—";

  const spendSub = loading
    ? "Loading…"
    : summary
      ? summary.campaignCount === 0
        ? "No campaigns yet"
        : `Across ${summary.campaignCount} campaign${summary.campaignCount === 1 ? "" : "s"} · 30d`
      : "—";

  const impSub = loading
    ? "Loading…"
    : summary
      ? summary.impressions === 0
        ? "No impressions yet"
        : "Last 30 days (campaign totals)"
      : "—";

  const ctrSub = loading
    ? "Loading…"
    : summary
      ? summary.impressions === 0
        ? "No impressions yet"
        : summary.avgCtr >= 2
          ? "Above 2% target"
          : "Below 2% benchmark"
      : "—";

  const ctrTone: "good" | "neutral" =
    !loading && summary && summary.impressions > 0 && summary.avgCtr >= 2 ? "good" : "neutral";

  const kpis = [
    { label: "Total Spend", value: spendValue, delta: spendSub, tone: "neutral" as const },
    { label: "Total Impressions", value: impValue, delta: impSub, tone: "neutral" as const },
    { label: "Average CTR", value: ctrValue, delta: ctrSub, tone: ctrTone },
  ];

  if (loading) {
    return <SummaryCardsSkeleton count={4} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-neutral-600">{k.label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900">{k.value}</p>
          <p
            className={`mt-1 text-xs font-medium ${
              k.tone === "good" ? "text-primary" : "text-neutral-600"
            }`}
          >
            {k.delta}
          </p>
        </div>
      ))}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-neutral-600">Issues Detected</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900">{issueValue}</p>
        <p className={`mt-1 text-xs font-medium ${issueDeltaClass}`}>{issueDelta}</p>
      </div>
    </div>
  );
}
