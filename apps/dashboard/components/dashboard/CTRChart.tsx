"use client";

import { ChartInnerSkeleton } from "@/components/ui/DataSkeletons";
import { useDashboardFilters } from "@/components/layout/DashboardFiltersContext";
import { platformLabel } from "@/lib/campaignDisplay";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function CTRChart() {
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const chartHeight = isMdUp ? 288 : 192;
  const { rangeDays, platform } = useDashboardFilters();
  const { data, isLoading, error } = useAnalytics({
    days: rangeDays,
    platform: platform || undefined,
  });

  const chartData = useMemo(() => {
    if (!data?.dailySeries?.length) return [];
    return data.dailySeries.map((row) => {
      const ctr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
      return {
        day: row.day,
        label: row.day.slice(5),
        ctr: Number(ctr.toFixed(2)),
      };
    });
  }, [data]);

  const yMax = useMemo(() => {
    if (chartData.length === 0) return 3;
    const m = Math.max(...chartData.map((d) => d.ctr), 0.1);
    return Math.min(100, Math.ceil(m * 1.15 * 10) / 10);
  }, [chartData]);

  const subtitle = platform
    ? `Last ${rangeDays} days · ${platformLabel(platform)}`
    : `Last ${rangeDays} days · blended (all platforms)`;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
      <h3 className="text-sm font-bold text-neutral-900">CTR trend</h3>
      <p className="text-xs text-neutral-600">{subtitle}</p>
      {error && <p className="mt-2 text-xs text-amber-600">{error}</p>}
      {isLoading ? (
        <ChartInnerSkeleton className={isMdUp ? "h-72" : "h-48"} />
      ) : chartData.length === 0 ? (
        <p className="mt-8 rounded-xl bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-600">
          No daily metrics in this window. Add campaigns and metrics, or run a sync.
        </p>
      ) : (
        <div className="mt-4 w-full min-w-0">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#737373" />
              <YAxis
                domain={[0, yMax]}
                tick={{ fontSize: 11 }}
                stroke="#737373"
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(v) => [`${Number(v ?? 0)}%`, "CTR"]}
                labelFormatter={(label) => (typeof label === "string" ? label : "Day")}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e5e5e5" }}
              />
              <Line
                type="monotone"
                dataKey="ctr"
                stroke="#6845ab"
                strokeWidth={2}
                dot={false}
                name="CTR"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
