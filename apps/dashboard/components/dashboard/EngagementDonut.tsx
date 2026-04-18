"use client";

import { ChartInnerSkeleton } from "@/components/ui/DataSkeletons";
import { useDashboardFilters } from "@/components/layout/DashboardFiltersContext";
import { platformLabel } from "@/lib/campaignDisplay";
import { platformHex } from "@/lib/platformColors";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export function EngagementDonut() {
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const chartHeight = isMdUp ? 288 : 192;
  const innerR = isMdUp ? 55 : 40;
  const outerR = isMdUp ? 85 : 62;
  const { rangeDays, platform } = useDashboardFilters();
  const { data, isLoading, error } = useAnalytics({
    days: rangeDays,
    platform: platform || undefined,
  });

  const pieData = useMemo(() => {
    if (!data?.byPlatform) return [];
    return Object.entries(data.byPlatform)
      .filter(([, v]) => v.clicks > 0)
      .map(([key, v]) => ({
        key,
        name: platformLabel(key),
        value: v.clicks,
        fill: platformHex(key),
      }));
  }, [data]);

  const totalClicks = pieData.reduce((s, x) => s + x.value, 0);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
      <h3 className="text-sm font-bold text-neutral-900">Click mix by platform</h3>
      <p className="text-xs text-neutral-600">
        Share of clicks in the last {rangeDays} days{platform ? ` · ${platformLabel(platform)}` : ""}
      </p>
      {error && <p className="mt-2 text-xs text-amber-600">{error}</p>}
      {isLoading ? (
        <ChartInnerSkeleton className={isMdUp ? "h-72" : "h-48"} label="Loading chart" />
      ) : totalClicks === 0 ? (
        <p className="mt-8 rounded-xl bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-600">
          No clicks recorded yet. Connect platforms and sync campaigns.
        </p>
      ) : (
        <>
          <div className="mt-4 w-full min-w-0">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={innerR}
                  outerRadius={outerR}
                  paddingAngle={2}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={entry.key} fill={entry.fill} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => {
                    const val = Number(value ?? 0);
                    const pct = totalClicks > 0 ? Math.round((val / totalClicks) * 100) : 0;
                    return [`${val.toLocaleString("en-IN")} clicks (${pct}%)`, String(name)];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-neutral-600">
            {pieData.map((e) => (
              <li key={e.key} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: e.fill }} />
                {e.name}{" "}
                {totalClicks > 0 ? Math.round((e.value / totalClicks) * 100) : 0}%
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
