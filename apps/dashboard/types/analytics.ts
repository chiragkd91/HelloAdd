/** `GET /api/analytics` response (extended). */
export type AnalyticsByPlatform = {
  campaigns: number;
  spend: number;
  impressions: number;
  clicks: number;
};

export type AnalyticsDailyPoint = {
  day: string;
  impressions: number;
  clicks: number;
};

export type AnalyticsRegionRow = {
  region: string;
  impressions: number;
  intensity: number;
};

export type AnalyticsResponse = {
  organizationId: string;
  summary: {
    campaignCount: number;
    impressions: number;
    clicks: number;
    budgetSpent: number;
    conversions: number;
    avgCtr: number;
  };
  byPlatform: Record<string, AnalyticsByPlatform>;
  metricsSeriesTotals: {
    impressions: number;
    clicks: number;
    spend: number;
  } | null;
  dailySeries: AnalyticsDailyPoint[];
  regionBreakdown: AnalyticsRegionRow[];
};
