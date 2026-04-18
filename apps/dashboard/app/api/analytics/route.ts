import { Campaign, CampaignMetric } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";

export async function GET(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") ?? undefined;
  const daysRaw = Number(searchParams.get("days") ?? 30);
  const days = Number.isFinite(daysRaw) ? Math.min(90, Math.max(1, daysRaw)) : 30;

  const match: Record<string, unknown> = { organizationId: auth.organizationId };
  if (platform) match.platform = platform;

  const campaigns = await Campaign.find(match).lean();

  let impressions = 0;
  let clicks = 0;
  let budgetSpent = 0;
  let conversions = 0;
  const byPlatform: Record<
    string,
    { campaigns: number; spend: number; impressions: number; clicks: number }
  > = {};

  const byRegion: Record<string, { impressions: number; spend: number; campaigns: number }> = {};

  for (const c of campaigns) {
    impressions += c.impressions;
    clicks += c.clicks;
    budgetSpent += c.budgetSpent;
    conversions += c.conversions;
    const p = c.platform;
    if (!byPlatform[p]) {
      byPlatform[p] = { campaigns: 0, spend: 0, impressions: 0, clicks: 0 };
    }
    byPlatform[p].campaigns += 1;
    byPlatform[p].spend += c.budgetSpent;
    byPlatform[p].impressions += c.impressions;
    byPlatform[p].clicks += c.clicks;

    const reg = (c.region && String(c.region).trim()) || "Unassigned";
    if (!byRegion[reg]) {
      byRegion[reg] = { impressions: 0, spend: 0, campaigns: 0 };
    }
    byRegion[reg].campaigns += 1;
    byRegion[reg].impressions += c.impressions;
    byRegion[reg].spend += c.budgetSpent;
  }

  const campaignIds = campaigns.map((c) => c._id);

  const metricAgg =
    campaignIds.length > 0
      ? await CampaignMetric.aggregate([
          { $match: { campaignId: { $in: campaignIds } } },
          {
            $group: {
              _id: null,
              impressions: { $sum: "$impressions" },
              clicks: { $sum: "$clicks" },
              spend: { $sum: "$spend" },
            },
          },
        ])
      : [];

  const m = metricAgg[0];

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - days);

  const dailyAgg =
    campaignIds.length > 0
      ? await CampaignMetric.aggregate([
          {
            $match: {
              campaignId: { $in: campaignIds },
              date: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
              impressions: { $sum: "$impressions" },
              clicks: { $sum: "$clicks" },
            },
          },
          { $sort: { _id: 1 } },
        ])
      : [];

  const dailySeries = dailyAgg.map((row) => ({
    day: String(row._id),
    impressions: row.impressions as number,
    clicks: row.clicks as number,
  }));

  const maxRegionImp = Math.max(1, ...Object.values(byRegion).map((x) => x.impressions));
  const regionBreakdown = Object.entries(byRegion)
    .map(([region, v]) => ({
      region,
      impressions: v.impressions,
      intensity: Math.round((v.impressions / maxRegionImp) * 100),
    }))
    .sort((a, b) => b.impressions - a.impressions);

  return jsonOk({
    organizationId: auth.organizationId,
    summary: {
      campaignCount: campaigns.length,
      impressions,
      clicks,
      budgetSpent,
      conversions,
      avgCtr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    },
    byPlatform,
    metricsSeriesTotals: m
      ? {
          impressions: m.impressions,
          clicks: m.clicks,
          spend: m.spend,
        }
      : null,
    dailySeries,
    regionBreakdown,
  });
}
