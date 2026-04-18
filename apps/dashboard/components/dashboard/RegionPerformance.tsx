"use client";

import { RegionBarsSkeleton } from "@/components/ui/DataSkeletons";
import { useDashboardFilters } from "@/components/layout/DashboardFiltersContext";
import { useAnalytics } from "@/hooks/useAnalytics";

export function RegionPerformance() {
  const { rangeDays, platform } = useDashboardFilters();
  const { data, isLoading, error } = useAnalytics({
    days: rangeDays,
    platform: platform || undefined,
  });

  const regions = data?.regionBreakdown ?? [];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
      <h3 className="text-sm font-bold text-neutral-900">Top performing regions</h3>
      <p className="text-xs text-neutral-600">
        By impressions (normalized){platform ? ` · filtered` : ""} · last {rangeDays} days
      </p>
      {error && <p className="mt-2 text-xs text-amber-600">{error}</p>}
      {isLoading ? (
        <RegionBarsSkeleton />
      ) : regions.length === 0 ? (
        <p className="mt-8 rounded-xl bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-600">
          No region data on campaigns yet. Set a region on campaigns or sync from ad platforms.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {regions.map((r) => (
            <li key={r.region} className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
              <span className="w-full max-w-[12rem] shrink-0 text-xs font-medium text-neutral-700 sm:w-28">
                {r.region}
              </span>
              <div className="h-2 min-w-0 flex-1 rounded-full bg-neutral-100 sm:max-w-[200px]">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${r.intensity}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-neutral-600">{r.intensity}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
