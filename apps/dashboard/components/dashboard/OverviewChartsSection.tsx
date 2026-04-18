"use client";

import dynamic from "next/dynamic";
import { ChartCardSkeleton } from "@/components/dashboard/ChartCardSkeleton";
import { RegionPerformance } from "@/components/dashboard/RegionPerformance";

const SpendChart = dynamic(
  () => import("@/components/dashboard/SpendChart").then((m) => m.SpendChart),
  { ssr: false, loading: () => <ChartCardSkeleton /> }
);

const CTRChart = dynamic(
  () => import("@/components/dashboard/CTRChart").then((m) => m.CTRChart),
  { ssr: false, loading: () => <ChartCardSkeleton /> }
);

const EngagementDonut = dynamic(
  () => import("@/components/dashboard/EngagementDonut").then((m) => m.EngagementDonut),
  { ssr: false, loading: () => <ChartCardSkeleton tall={false} /> }
);

/** Client-only: `next/dynamic` with `ssr: false` is not allowed in Server Components (Next 15+ / Turbopack). */
export function OverviewChartsSection() {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <SpendChart />
        <CTRChart />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <RegionPerformance />
        <EngagementDonut />
      </div>
    </>
  );
}
