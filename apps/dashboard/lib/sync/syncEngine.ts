import {
  Campaign,
  CampaignMetric,
  connectMongo,
  Integration,
  type AdStatus,
  type Platform,
} from "@helloadd/database";
import { getMetaCampaignInsights, getMetaCampaigns } from "@/lib/api/meta";
import { getGoogleCampaignMetrics, getGoogleCampaigns } from "@/lib/api/google";
import { getLinkedInCampaignMetrics, getLinkedInCampaigns } from "@/lib/api/linkedin";
import type { MetaInsights } from "@/types/platform";
import { detectErrors } from "@/lib/errors/errorDetector";
import {
  deactivateIntegration,
  ensureFreshAccessToken,
  type LiveIntegration,
} from "@/lib/sync/tokenManager";

export type SyncOrganizationResult = {
  synced: number;
  errors: string[];
  lastSyncedAt: string | null;
};

function utcDayStart(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mapMetaStatus(s: string): AdStatus {
  const u = s.toUpperCase();
  if (u === "ACTIVE") return "LIVE";
  if (u === "PAUSED") return "PAUSED";
  if (u === "ARCHIVED" || u === "DELETED") return "ENDED";
  return "DRAFT";
}

function mapGoogleStatus(s: string): AdStatus {
  const u = s.toUpperCase();
  if (u === "ENABLED") return "LIVE";
  if (u === "PAUSED") return "PAUSED";
  if (u === "REMOVED") return "ENDED";
  return "DRAFT";
}

function mapLinkedInStatus(s: string): AdStatus {
  const u = s.toUpperCase();
  if (u === "ACTIVE" || u === "RUNNING") return "LIVE";
  if (u === "PAUSED") return "PAUSED";
  if (u === "COMPLETED" || u === "ARCHIVED") return "ENDED";
  return "DRAFT";
}

function metaConversionsFromInsights(insights: MetaInsights): number {
  const actions = insights.actions;
  if (!actions?.length) return 0;
  let sum = 0;
  for (const a of actions) {
    const t = (a.action_type ?? "").toLowerCase();
    if (
      t.includes("conversion") ||
      t.includes("purchase") ||
      t.includes("lead") ||
      t === "offsite_conversion.fb_pixel_purchase"
    ) {
      sum += Number(a.value ?? 0);
    }
  }
  return sum;
}

function parseGoogleStartDate(raw: string): Date {
  const day = raw.slice(0, 10);
  const t = Date.parse(`${day}T00:00:00.000Z`);
  return Number.isFinite(t) ? new Date(t) : new Date();
}

async function upsertCampaignAndMetric(args: {
  organizationId: string;
  integrationId: string;
  platform: Platform;
  externalId: string;
  name: string;
  status: AdStatus;
  startDate: Date;
  endDate: Date | null;
  budgetTotal: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  metricDay: Date;
}): Promise<void> {
  const now = new Date();
  const filter = {
    organizationId: args.organizationId,
    integrationId: args.integrationId,
    externalId: args.externalId,
  };

  const campaignDoc = await Campaign.findOneAndUpdate(
    filter,
    {
      $set: {
        name: args.name,
        platform: args.platform,
        status: args.status,
        startDate: args.startDate,
        endDate: args.endDate,
        budgetTotal: args.budgetTotal,
        budgetSpent: args.spend,
        impressions: args.impressions,
        clicks: args.clicks,
        conversions: args.conversions,
        ctr: args.ctr,
        cpc: args.cpc,
        errorType: "NONE",
        errorMessage: null,
        lastSyncedAt: now,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  if (!campaignDoc?._id) return;

  await CampaignMetric.findOneAndUpdate(
    { campaignId: campaignDoc._id, date: args.metricDay },
    {
      $set: {
        impressions: args.impressions,
        clicks: args.clicks,
        spend: args.spend,
        conversions: args.conversions,
        ctr: args.ctr,
      },
    },
    { upsert: true }
  );
}

async function syncMetaLike(
  doc: LiveIntegration,
  accessToken: string,
  metricDay: Date,
  todayYmd: string,
  errors: string[]
): Promise<{ count: number; listOk: boolean }> {
  const adAccountId =
    typeof doc.metadata === "object" &&
    doc.metadata &&
    typeof (doc.metadata as { adAccountId?: unknown }).adAccountId === "string"
      ? ((doc.metadata as { adAccountId?: string }).adAccountId as string)
      : doc.accountId;

  let campaigns;
  try {
    campaigns = await getMetaCampaigns(accessToken, adAccountId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`${doc.platform}: ${msg}`);
    if (msg.includes("META_TOKEN_EXPIRED") || msg.includes("expired")) {
      await deactivateIntegration(doc._id, doc.organizationId, doc.platform, msg);
    }
    return { count: 0, listOk: false };
  }

  let count = 0;
  for (const c of campaigns) {
    let insights;
    try {
      insights = await getMetaCampaignInsights(accessToken, c.id, {
        since: todayYmd,
        until: todayYmd,
      });
    } catch (e) {
      errors.push(`${doc.platform} campaign ${c.id}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    const impressions = Number(insights.impressions ?? 0);
    const clicks = Number(insights.clicks ?? 0);
    const spend = Number(insights.spend ?? 0);
    const ctr = Number(insights.ctr ?? 0);
    const cpc = Number(insights.cpc ?? 0);
    const conversions = metaConversionsFromInsights(insights);

    const daily = Number(c.daily_budget ?? 0) / 100;
    const lifetime = Number(c.lifetime_budget ?? 0) / 100;
    const budgetTotal = daily > 0 ? daily : lifetime > 0 ? lifetime : 0;

    const startDate = c.start_time ? new Date(c.start_time) : metricDay;
    const endDate = c.stop_time ? new Date(c.stop_time) : null;

    await upsertCampaignAndMetric({
      organizationId: doc.organizationId,
      integrationId: doc._id,
      platform: doc.platform,
      externalId: c.id,
      name: c.name || `Campaign ${c.id}`,
      status: mapMetaStatus(c.status),
      startDate,
      endDate,
      budgetTotal,
      impressions,
      clicks,
      conversions,
      spend,
      ctr,
      cpc,
      metricDay,
    });
    count += 1;
  }

  return { count, listOk: true };
}

async function syncGoogleIntegration(
  doc: LiveIntegration,
  accessToken: string,
  developerToken: string,
  metricDay: Date,
  todayYmd: string,
  errors: string[]
): Promise<{ count: number; listOk: boolean }> {
  const adAccountId =
    typeof doc.metadata === "object" &&
    doc.metadata &&
    typeof (doc.metadata as { adAccountId?: unknown }).adAccountId === "string"
      ? ((doc.metadata as { adAccountId?: string }).adAccountId as string)
      : doc.accountId;

  let campaigns;
  try {
    campaigns = await getGoogleCampaigns(accessToken, developerToken, adAccountId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`GOOGLE: ${msg}`);
    if (msg.includes("GOOGLE_TOKEN_EXPIRED") || msg.includes("401")) {
      await deactivateIntegration(doc._id, doc.organizationId, "GOOGLE", msg);
    }
    return { count: 0, listOk: false };
  }

  let count = 0;
  for (const c of campaigns) {
    let metrics;
    try {
      metrics = await getGoogleCampaignMetrics(accessToken, developerToken, adAccountId, c.id, {
        start: todayYmd,
        end: todayYmd,
      });
    } catch (e) {
      errors.push(`GOOGLE campaign ${c.id}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    const impressions = metrics.impressions;
    const clicks = metrics.clicks;
    const spend = metrics.costMicros / 1_000_000;
    const ctr = metrics.ctr;
    const cpc =
      metrics.averageCpcMicros != null ? metrics.averageCpcMicros / 1_000_000 : 0;
    const conversions = metrics.conversions;

    await upsertCampaignAndMetric({
      organizationId: doc.organizationId,
      integrationId: doc._id,
      platform: "GOOGLE",
      externalId: c.id,
      name: c.name || `Campaign ${c.id}`,
      status: mapGoogleStatus(c.status),
      startDate: parseGoogleStartDate(c.startDate || todayYmd),
      endDate: c.endDate ? parseGoogleStartDate(c.endDate) : null,
      budgetTotal: 0,
      impressions,
      clicks,
      conversions,
      spend,
      ctr,
      cpc,
      metricDay,
    });
    count += 1;
  }

  return { count, listOk: true };
}

async function syncLinkedInIntegration(
  doc: LiveIntegration,
  accessToken: string,
  metricDay: Date,
  todayYmd: string,
  errors: string[]
): Promise<{ count: number; listOk: boolean }> {
  const adAccountId =
    typeof doc.metadata === "object" &&
    doc.metadata &&
    typeof (doc.metadata as { adAccountId?: unknown }).adAccountId === "string"
      ? ((doc.metadata as { adAccountId?: string }).adAccountId as string)
      : doc.accountId;

  let campaigns;
  try {
    campaigns = await getLinkedInCampaigns(accessToken, adAccountId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`LINKEDIN: ${msg}`);
    if (msg.includes("LINKEDIN_TOKEN_EXPIRED") || msg.includes("401")) {
      await deactivateIntegration(doc._id, doc.organizationId, "LINKEDIN", msg);
    }
    return { count: 0, listOk: false };
  }

  let count = 0;
  for (const c of campaigns) {
    const idStr = String(c.id);
    let metrics;
    try {
      metrics = await getLinkedInCampaignMetrics(accessToken, idStr, {
        start: todayYmd,
        end: todayYmd,
      });
    } catch (e) {
      errors.push(`LINKEDIN campaign ${idStr}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    const impressions = metrics.impressions;
    const clicks = metrics.clicks;
    const spend = metrics.costInLocalCurrency;
    const ctr = metrics.clickThroughRate;
    const conversions = typeof metrics.leads === "number" ? metrics.leads : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;

    let budgetTotal = 0;
    if (c.totalBudget && typeof c.totalBudget === "object" && "amount" in c.totalBudget) {
      const amt = (c.totalBudget as { amount?: string }).amount;
      budgetTotal = amt != null ? Number(amt) : 0;
    }

    await upsertCampaignAndMetric({
      organizationId: doc.organizationId,
      integrationId: doc._id,
      platform: "LINKEDIN",
      externalId: idStr,
      name: c.name || `Campaign ${idStr}`,
      status: mapLinkedInStatus(c.status),
      startDate: metricDay,
      endDate: null,
      budgetTotal,
      impressions,
      clicks,
      conversions,
      spend,
      ctr,
      cpc,
      metricDay,
    });
    count += 1;
  }

  return { count, listOk: true };
}

async function syncOneIntegration(
  doc: LiveIntegration,
  errors: string[]
): Promise<number> {
  const creds = await ensureFreshAccessToken(doc, errors);
  if (!creds) {
    return 0;
  }

  const metricDay = utcDayStart();
  const todayYmd = formatYmd(metricDay);
  const platform = doc.platform;

  let count = 0;
  let listOk = false;

  switch (platform) {
    case "FACEBOOK":
    case "INSTAGRAM": {
      const r = await syncMetaLike(doc, creds.accessToken, metricDay, todayYmd, errors);
      count = r.count;
      listOk = r.listOk;
      break;
    }
    case "GOOGLE": {
      const dev =
        process.env.GOOGLE_DEVELOPER_TOKEN ?? process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "";
      if (!dev) {
        errors.push("GOOGLE: set GOOGLE_DEVELOPER_TOKEN (or GOOGLE_ADS_DEVELOPER_TOKEN) to sync.");
        return 0;
      }
      const r = await syncGoogleIntegration(doc, creds.accessToken, dev, metricDay, todayYmd, errors);
      count = r.count;
      listOk = r.listOk;
      break;
    }
    case "LINKEDIN": {
      const r = await syncLinkedInIntegration(doc, creds.accessToken, metricDay, todayYmd, errors);
      count = r.count;
      listOk = r.listOk;
      break;
    }
    case "YOUTUBE":
    case "TWITTER": {
      errors.push(`${platform}: sync not implemented yet.`);
      return 0;
    }
    case "WHATSAPP": {
      errors.push("WHATSAPP: Business Cloud is for alerts and messaging only — no campaign sync.");
      return 0;
    }
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }

  if (listOk) {
    await Integration.findByIdAndUpdate(doc._id, { $set: { lastSyncedAt: new Date() } });
  }

  return count;
}

export type SyncOrganizationOptions = {
  /** When set, only integrations for this ad platform are synced. */
  platform?: Platform;
};

/**
 * Pulls campaigns and today’s metrics for active integrations of an organization.
 */
export async function syncOrganization(
  organizationId: string,
  options?: SyncOrganizationOptions
): Promise<SyncOrganizationResult> {
  await connectMongo();

  const q: Record<string, unknown> = {
    organizationId,
    isActive: true,
  };
  if (options?.platform) {
    q.platform = options.platform;
  }

  const integrations = (await Integration.find(q).lean()) as LiveIntegration[];

  const errors: string[] = [];
  let synced = 0;
  let latest: Date | null = null;

  for (const doc of integrations) {
    try {
      const count = await syncOneIntegration(doc, errors);
      synced += count;
      const updated = await Integration.findById(doc._id).lean();
      const ls = updated?.lastSyncedAt;
      if (ls && (!latest || new Date(ls) > new Date(latest))) latest = new Date(ls);
    } catch (e) {
      errors.push(
        `${doc.platform}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  try {
    await detectErrors(organizationId);
  } catch (e) {
    errors.push(
      `Error detection: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  return {
    synced,
    errors,
    lastSyncedAt: latest ? latest.toISOString() : null,
  };
}
