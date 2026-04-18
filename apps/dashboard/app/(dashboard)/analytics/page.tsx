"use client";

import {
  ChartInnerSkeleton,
  RegionBarsSkeleton,
  SummaryCardsSkeleton,
} from "@/components/ui/DataSkeletons";
import { AnalyticsFilters } from "@/components/dashboard/AnalyticsFilters";
import { useDashboardFilters } from "@/components/layout/DashboardFiltersContext";
import { platformLabel } from "@/lib/campaignDisplay";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
}

export default function AnalyticsPage() {
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const { rangeDays, platform } = useDashboardFilters();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const platformParam = platform || (selectedPlatforms.length === 1 ? selectedPlatforms[0] : undefined);

  const { data, isLoading, error, refresh } = useAnalytics({
    days: rangeDays,
    platform: platformParam,
  });

  const ctrRows = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(data.byPlatform).map(([key, v]) => ({
      key,
      platform: platformLabel(key),
      ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
    }));
    if (selectedPlatforms.length <= 1) return entries;
    return entries.filter((e) => selectedPlatforms.includes(e.key));
  }, [data, selectedPlatforms]);

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  const dailyData = data?.dailySeries ?? [];
  const hasDaily = dailyData.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Analytics</h1>
          <p className="mt-1 text-sm text-neutral-600">Performance metrics across your campaigns.</p>
        </div>
        <AnalyticsFilters
          selectedCtrPlatforms={selectedPlatforms}
          onToggleCtrPlatform={togglePlatform}
          onClearCtrPlatforms={() => setSelectedPlatforms([])}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error}
          <button type="button" className="ml-2 font-semibold text-primary underline" onClick={() => refresh()}>
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <SummaryCardsSkeleton count={4} />
      ) : (
        data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Impressions", value: formatCompact(data.summary.impressions) },
              { label: "Clicks", value: formatCompact(data.summary.clicks) },
              { label: "Avg CTR", value: `${data.summary.avgCtr.toFixed(2)}%` },
              { label: "Spend (campaign)", value: `₹${data.summary.budgetSpent.toLocaleString("en-IN")}` },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-neutral-600">{k.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">{k.value}</p>
                <p className="mt-1 text-[11px] text-neutral-600">{data.summary.campaignCount} campaigns</p>
              </div>
            ))}
          </div>
        )
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Impressions &amp; clicks (daily)</h2>
        <p className="mt-1 text-xs text-neutral-600">Daily totals for the selected range.</p>
        {isLoading ? (
          <ChartInnerSkeleton className={isMdUp ? "h-72" : "h-48"} />
        ) : !hasDaily ? (
          <p className="mt-8 rounded-xl bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-600">
            No daily metric rows in this window. Seed campaigns and add metrics, or run a sync when available.
          </p>
        ) : (
          <div className="mt-4 w-full min-w-0">
            <ResponsiveContainer width="100%" height={isMdUp ? 288 : 192}>
              <ComposedChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => formatCompact(Number(v))}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => formatCompact(Number(v))}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="impressions"
                  fill="#86efac"
                  name="Impressions"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="clicks"
                  stroke="#6845ab"
                  strokeWidth={2}
                  dot={false}
                  name="Clicks"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">CTR by platform</h2>
          <p className="mt-1 text-xs text-neutral-600">Computed from campaign-level impressions &amp; clicks.</p>
          {isLoading ? (
            <ChartInnerSkeleton className={isMdUp ? "h-64" : "h-48"} />
          ) : ctrRows.length === 0 ? (
            <p className="mt-8 text-center text-sm text-neutral-600">No platform data.</p>
          ) : (
            <div className="mt-4 w-full min-w-0">
              <ResponsiveContainer width="100%" height={isMdUp ? 256 : 192}>
                <BarChart data={ctrRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="platform" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${Number(v ?? 0).toFixed(2)}%`, "CTR"]} />
                  <Bar dataKey="ctr" fill="#6845ab" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Region intensity</h2>
          <p className="mt-1 text-xs text-neutral-600">By campaign region field (normalized to max impressions).</p>
          {isLoading ? (
            <RegionBarsSkeleton />
          ) : !data?.regionBreakdown.length ? (
            <p className="mt-8 text-center text-sm text-neutral-600">No region data on campaigns.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.regionBreakdown.map((r) => (
                <li key={r.region}>
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-600">
                    <span>{r.region}</span>
                    <span className="tabular-nums">{r.intensity}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${r.intensity}%`, opacity: 0.5 + r.intensity / 200 }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-neutral-900">Audience breakdown</h2>
        <div className="mt-4 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 p-6 text-sm text-neutral-600">
          Age, device, and gender splits are not stored in Hello Add yet. They will come from Meta / Google /
          LinkedIn audience APIs in a later integration phase.
        </div>
      </div>

      {data?.metricsSeriesTotals && (
        <p className="text-[11px] text-neutral-600">
          Metric table totals (all time for matched campaigns): impressions{" "}
          {formatCompact(data.metricsSeriesTotals.impressions)}, clicks{" "}
          {formatCompact(data.metricsSeriesTotals.clicks)}, spend ₹
          {data.metricsSeriesTotals.spend.toLocaleString("en-IN")}.
        </p>
      )}
    </div>
  );
}
