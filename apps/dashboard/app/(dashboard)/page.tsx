import { AIChatPanel } from "@/components/ai/AIChatPanel";
import { AIInsightsCard } from "@/components/dashboard/AIInsightsCard";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { ChartCardSkeleton } from "@/components/dashboard/ChartCardSkeleton";
import { ErrorPanel } from "@/components/dashboard/ErrorPanel";
import { KPIGrid } from "@/components/dashboard/KPIGrid";
import { HashtagPulse } from "@/components/dashboard/HashtagPulse";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { RegionPerformance } from "@/components/dashboard/RegionPerformance";
import dynamic from "next/dynamic";

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

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Overview</h1>
        <p className="mt-1 text-base text-neutral-600">Unified snapshot across connected platforms.</p>
      </div>
      <KPIGrid />
      <AIInsightsCard />
      <div>
        <h2 className="text-lg font-bold tracking-tight text-neutral-900">Marketing trends & hashtags</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Curated industry signals and hashtag momentum — use for briefs, scheduler copy, and creative tests.
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <HashtagPulse compact />
          <MarketPulse compact itemLimit={8} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SpendChart />
        <CTRChart />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <RegionPerformance />
        <EngagementDonut />
      </div>
      <CampaignTable />
      <ErrorPanel />
      <AIChatPanel />
    </div>
  );
}
