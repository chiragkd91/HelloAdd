"use client";

import { ChartInnerSkeleton } from "@/components/ui/DataSkeletons";
import { useDashboardFilters } from "@/components/layout/DashboardFiltersContext";
import { platformLabel } from "@/lib/campaignDisplay";
import { useAnalytics } from "@/hooks/useAnalytics";
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

export function SpendChart() {
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const chartHeight = isMdUp ? 288 : 192;
  const { rangeDays, platform } = useDashboardFilters();
  const { data, isLoading, error } = useAnalytics({
    days: rangeDays,
    platform: platform || undefined,
  });

  const chartData =
    data?.byPlatform != null
      ? Object.entries(data.byPlatform).map(([key, v]) => ({
          name: platformLabel(key),
          spend: v.spend,
        }))
      : [];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
      <h3 className="text-sm font-bold text-neutral-900">Spend by platform</h3>
      <p className="text-xs text-neutral-600">
        Last {rangeDays} days
        {platform ? ` · ${platformLabel(platform)}` : ""} —{" "}
        <span className="text-neutral-600">live from analytics</span>
      </p>
      {error && (
        <p className="mt-2 text-xs text-amber-600">{error}</p>
      )}
      <div className="mt-4 w-full min-w-0">
        {isLoading ? (
          <ChartInnerSkeleton className={isMdUp ? "h-72" : "h-48"} />
        ) : chartData.length === 0 ? (
          <p className="mt-16 py-8 text-center text-sm text-neutral-600">
            No spend data — adjust filters or seed campaigns.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#737373" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#737373"
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [`₹${Number(value ?? 0).toLocaleString("en-IN")}`, "Spend"]}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e5e5e5" }}
              />
              <Bar dataKey="spend" fill="#6845ab" radius={[6, 6, 0, 0]} name="Spend" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
