import {
  Campaign,
  CampaignMetric,
  Organization,
  connectMongo,
  type CampaignAttrs,
} from "@helloadd/database";

export type PlatformSummary = {
  platform: string;
  campaigns: number;
  totalSpend: number;
  impressions: number;
  clicks: number;
  avgCtr: number;
  conversions: number;
};

export type ReportData = {
  organizationId: string;
  organizationName: string;
  /** URL-safe slug for filenames (e.g. PDF download names). */
  organizationSlug: string;
  dateFrom: string;
  dateTo: string;
  campaigns: CampaignAttrs[];
  metrics: {
    totalSpend: number;
    totalImpressions: number;
    avgCTR: number;
    totalConversions: number;
  };
  platformBreakdown: PlatformSummary[];
  recommendations: string[];
  /** Top campaigns by CTR for PDF table */
  topByCtr: CampaignAttrs[];
};

export type DailyMetricRow = {
  date: string;
  facebookSpend: number;
  googleSpend: number;
  linkedinSpend: number;
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
};

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function utcDayStart(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatRangeLabel(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  return `${from.toLocaleDateString("en-IN", opts)} – ${to.toLocaleDateString("en-IN", opts)}`;
}

export async function loadCampaignsForReport(
  organizationId: string,
  dateFrom?: Date | null,
  dateTo?: Date | null
): Promise<CampaignAttrs[]> {
  const q: Record<string, unknown> = { organizationId };
  if (dateFrom && dateTo) {
    q.$and = [
      { startDate: { $lte: dateTo } },
      { $or: [{ endDate: null }, { endDate: { $gte: dateFrom } }] },
    ];
  }
  return (await Campaign.find(q).sort({ ctr: -1 }).limit(500).lean()) as CampaignAttrs[];
}

function aggregateMetrics(campaigns: CampaignAttrs[]): ReportData["metrics"] {
  let totalSpend = 0;
  let totalImpressions = 0;
  let totalConversions = 0;
  let ctrWeight = 0;
  let ctrSum = 0;
  for (const c of campaigns) {
    totalSpend += c.budgetSpent;
    totalImpressions += c.impressions;
    totalConversions += c.conversions;
    if (c.impressions > 0) {
      ctrSum += c.ctr * c.impressions;
      ctrWeight += c.impressions;
    }
  }
  const avgCTR = ctrWeight > 0 ? ctrSum / ctrWeight : 0;
  return { totalSpend, totalImpressions, avgCTR, totalConversions };
}

function platformBreakdownFrom(campaigns: CampaignAttrs[]): PlatformSummary[] {
  const map = new Map<string, CampaignAttrs[]>();
  for (const c of campaigns) {
    const arr = map.get(c.platform) ?? [];
    arr.push(c);
    map.set(c.platform, arr);
  }
  const out: PlatformSummary[] = [];
  for (const [platform, list] of map) {
    let totalSpend = 0;
    let impressions = 0;
    let clicks = 0;
    let conversions = 0;
    let cw = 0;
    let cs = 0;
    for (const c of list) {
      totalSpend += c.budgetSpent;
      impressions += c.impressions;
      clicks += c.clicks;
      conversions += c.conversions;
      if (c.impressions > 0) {
        cs += c.ctr * c.impressions;
        cw += c.impressions;
      }
    }
    out.push({
      platform,
      campaigns: list.length,
      totalSpend,
      impressions,
      clicks,
      avgCtr: cw > 0 ? cs / cw : 0,
      conversions,
    });
  }
  return out.sort((a, b) => b.totalSpend - a.totalSpend);
}

function buildRecommendations(
  platformBreakdown: PlatformSummary[],
  campaignCount: number
): string[] {
  const top = platformBreakdown[0];
  if (top && campaignCount > 0) {
    return [
      `Lead with ${top.platform}: it drove the highest spend in this period (${top.avgCtr.toFixed(2)}% avg CTR).`,
      `${campaignCount} campaigns ran across ${platformBreakdown.length} platform(s) — consolidate learnings into next month’s plan.`,
      "Tighten UTMs on landing pages and review any campaigns with CTR below your platform benchmarks.",
    ];
  }
  return [
    "Connect ad accounts to populate this report with live performance data.",
    "Set monthly budgets and enable alerts to catch overspend early.",
    "Export weekly to align marketing with finance and leadership.",
  ];
}

export async function loadReportData(
  organizationId: string,
  dateFrom?: Date | null,
  dateTo?: Date | null
): Promise<ReportData> {
  await connectMongo();
  const org = await Organization.findById(organizationId).lean();
  const organizationName = org?.name ?? "Organization";
  const organizationSlug = org?.slug?.trim() || "organization";

  const from = dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = dateTo ?? new Date();
  const campaigns = await loadCampaignsForReport(organizationId, from, to);
  const metrics = aggregateMetrics(campaigns);
  const platformBreakdown = platformBreakdownFrom(campaigns);
  const topByCtr = [...campaigns].sort((a, b) => b.ctr - a.ctr).slice(0, 5);
  return {
    organizationId,
    organizationName,
    organizationSlug,
    dateFrom: iso(from),
    dateTo: iso(to),
    campaigns,
    metrics,
    platformBreakdown,
    recommendations: buildRecommendations(platformBreakdown, campaigns.length),
    topByCtr,
  };
}

export function reportDateRangeLabel(from: Date, to: Date): string {
  return formatRangeLabel(from, to);
}

/** Last 30 days of daily spend/clicks/impressions by platform (from CampaignMetric). */
export async function loadDailyMetricsLast30Days(
  organizationId: string
): Promise<DailyMetricRow[]> {
  await connectMongo();
  const start = utcDayStart(new Date());
  start.setUTCDate(start.getUTCDate() - 30);

  const campaigns = (await Campaign.find({ organizationId }).select(["_id", "platform"]).lean()) as Pick<
    CampaignAttrs,
    "_id" | "platform"
  >[];
  const cmap = Object.fromEntries(campaigns.map((c) => [c._id, c.platform]));

  const metrics = await CampaignMetric.find({
    campaignId: { $in: campaigns.map((c) => c._id) },
    date: { $gte: start },
  })
    .sort({ date: 1 })
    .lean();

  const byDate = new Map<
    string,
    {
      facebookSpend: number;
      googleSpend: number;
      linkedinSpend: number;
      totalSpend: number;
      totalClicks: number;
      totalImpressions: number;
    }
  >();

  for (const m of metrics) {
    const key = iso(m.date instanceof Date ? m.date : new Date(String(m.date)));
    const plat = cmap[m.campaignId] ?? "";
    const cur = byDate.get(key) ?? {
      facebookSpend: 0,
      googleSpend: 0,
      linkedinSpend: 0,
      totalSpend: 0,
      totalClicks: 0,
      totalImpressions: 0,
    };
    cur.totalSpend += m.spend;
    cur.totalClicks += m.clicks;
    cur.totalImpressions += m.impressions;
    if (plat === "FACEBOOK" || plat === "INSTAGRAM") cur.facebookSpend += m.spend;
    else if (plat === "GOOGLE") cur.googleSpend += m.spend;
    else if (plat === "LINKEDIN") cur.linkedinSpend += m.spend;
    byDate.set(key, cur);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      ...v,
    }));
}
