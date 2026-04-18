"use client";

import { HashtagPulse } from "@/components/dashboard/HashtagPulse";
import {
  MarketingTrendsFilters,
  type MarketSourceFilter,
  type PlatformFilter,
} from "@/components/dashboard/MarketingTrendsFilters";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { useState } from "react";

export default function MarketPulsePage() {
  const [platform, setPlatform] = useState<PlatformFilter>("ALL");
  const [marketSource, setMarketSource] = useState<MarketSourceFilter>("ALL");
  const platformFilter = platform === "ALL" ? null : platform;
  const sourceNameFilter = marketSource === "ALL" ? null : marketSource;

  return (
    <div className="space-y-8">
      <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Marketing trends hub</h1>

      <MarketingTrendsFilters
        platform={platform}
        onPlatformChange={setPlatform}
        marketSource={marketSource}
        onMarketSourceChange={setMarketSource}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <HashtagPulse
          compact={false}
          platformFilter={platformFilter}
          sourceNameFilter={sourceNameFilter}
        />
        <MarketPulse
          compact={false}
          platformFilter={platformFilter}
          sourceNameFilter={sourceNameFilter}
        />
      </div>
    </div>
  );
}
