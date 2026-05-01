import {
  Alert,
  Campaign,
  CampaignMetric,
  Organization,
  connectMongo,
  type AlertType,
  type CampaignAttrs,
  type ErrorType,
  type Platform,
  type Severity,
} from "@helloadd/database";
import { getAIErrorExplanation } from "@/lib/ai/errorExplainer";
import { dashboardPublicBaseUrl } from "@/lib/auth/dashboardBaseUrl";
import { sendCampaignAlertEmail } from "@/lib/email/sendAlertEmail";
import { getDigestRecipientEmail } from "@/lib/email/weeklyDigestData";
import { sendWhatsAppAlert } from "@/lib/notifications/whatsapp";

export type DetectedSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface DetectedError {
  type: ErrorType;
  severity: DetectedSeverity;
  campaignId?: string;
  campaignName?: string;
  platform?: string;
  message: string;
  suggestedFix: string;
}

const SEVERITY_RANK: Record<DetectedSeverity, number> = {
  CRITICAL: 3,
  WARNING: 2,
  INFO: 1,
};

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function utcDayStart(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isDeadStatus(c: CampaignAttrs): boolean {
  if (c.status === "ENDED") return true;
  if (c.endDate) {
    const end = new Date(c.endDate);
    return end < utcDayStart();
  }
  return false;
}

function ctrThresholdPct(platform: Platform): number {
  switch (platform) {
    case "FACEBOOK":
      return 1.5;
    case "INSTAGRAM":
      return 1.0;
    case "GOOGLE":
      return 3.0;
    case "LINKEDIN":
      return 0.4;
    case "YOUTUBE":
      return 0.8;
    case "TWITTER":
      return 1.0;
    case "WHATSAPP":
      return 1.0;
    default: {
      const _e: never = platform;
      return _e;
    }
  }
}

function errorTypeToAlertType(t: ErrorType): AlertType {
  switch (t) {
    case "OVERSPEND":
      return "OVERSPEND";
    case "CREATIVE_REJECTED":
      return "CREATIVE_REJECTED";
    case "LOW_CTR":
      return "CTR_DROP";
    case "EXPIRING_SOON":
      return "CAMPAIGN_EXPIRING";
    case "DEAD_CAMPAIGN":
    case "AUDIENCE_OVERLAP":
    case "MISSING_UTM":
      return "CAMPAIGN_ERROR";
    case "NONE":
      return "CAMPAIGN_ERROR";
    default: {
      const _x: never = t;
      return _x;
    }
  }
}

function mapSeverity(s: DetectedSeverity): Severity {
  return s;
}

async function recentSpendByCampaign(
  campaignIds: string[],
  since: Date
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (campaignIds.length === 0) return map;
  const rows = await CampaignMetric.aggregate<{
    _id: string;
    spend: number;
  }>([
    {
      $match: {
        campaignId: { $in: campaignIds },
        date: { $gte: since },
      },
    },
    {
      $group: {
        _id: "$campaignId",
        spend: { $sum: "$spend" },
      },
    },
  ]);
  for (const r of rows) {
    map.set(r._id, r.spend);
  }
  return map;
}

/**
 * Runs 7 automated checks, upserts Alerts, updates Campaign.errorType / errorMessage.
 */
async function notifyCriticalWhatsAppIfConfigured(
  organizationId: string,
  org: { settings?: { whatsappNumber?: string | null } } | null,
  e: DetectedError,
  dbAlertType: AlertType
): Promise<void> {
  if (e.severity !== "CRITICAL") return;
  const phone = org?.settings?.whatsappNumber?.trim();
  if (!phone) return;

  try {
    if (dbAlertType === "OVERSPEND" && e.campaignId) {
      const c = (await Campaign.findById(e.campaignId).lean()) as CampaignAttrs | null;
      if (c && c.budgetTotal > 0) {
        const pct = Math.round((c.budgetSpent / c.budgetTotal - 1) * 100);
        const extra = Math.max(0, c.budgetSpent - c.budgetTotal);
        await sendWhatsAppAlert(
          phone,
          "OVERSPEND",
          {
            campaignName: c.name,
            platform: c.platform,
            pct,
            extraAmount: extra,
          },
          { organizationId }
        );
        return;
      }
    }

    await sendWhatsAppAlert(
      phone,
      dbAlertType,
      {
        campaignName: e.campaignName,
        platform: e.platform,
        message: e.message,
      },
      { organizationId }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "WHATSAPP_NOT_CONFIGURED") {
      return;
    }
    console.error("[errorDetector] WhatsApp notify failed", err);
  }
}

async function notifyCriticalEmailIfConfigured(
  organizationId: string,
  org: { name?: string; settings?: { alertEmail?: string | null; reportEmail?: string | null } } | null,
  e: DetectedError,
  title: string
): Promise<void> {
  if (e.severity !== "CRITICAL") return;

  try {
    const to = await getDigestRecipientEmail(organizationId);
    if (!to) return;

    const dashboardUrl = `${dashboardPublicBaseUrl()}/`;

    await sendCampaignAlertEmail(to, {
      orgName: org?.name ?? "Your organization",
      title,
      message: e.message,
      severity: e.severity,
      campaignName: e.campaignName,
      dashboardUrl,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("RESEND_API_KEY")) {
      return;
    }
    console.error("[errorDetector] Email notify failed", err);
  }
}

export async function detectErrors(organizationId: string): Promise<DetectedError[]> {
  await connectMongo();

  const org = await Organization.findById(organizationId).select(["settings", "name"]).lean();

  const campaigns = (await Campaign.find({ organizationId }).lean()) as CampaignAttrs[];
  const now = new Date();
  const todayStart = utcDayStart(now);
  const in3Days = new Date(todayStart);
  in3Days.setUTCDate(in3Days.getUTCDate() + 3);
  const metricSince = new Date(todayStart);
  metricSince.setUTCDate(metricSince.getUTCDate() - 2);

  const spend48h = await recentSpendByCampaign(
    campaigns.map((c) => c._id),
    metricSince
  );

  const detected: DetectedError[] = [];

  // CHECK 1 — Dead campaign still spending (uses recent CampaignMetric spend)
  for (const c of campaigns) {
    if (!isDeadStatus(c)) continue;
    const recent = spend48h.get(c._id) ?? 0;
    if (recent > 0) {
      detected.push({
        type: "DEAD_CAMPAIGN",
        severity: "CRITICAL",
        campaignId: c._id,
        campaignName: c.name,
        platform: c.platform,
        message: `Campaign "${c.name}" is ended but recorded ${money(recent)} spend in recent daily metrics — review billing and pause delivery.`,
        suggestedFix: "Confirm the campaign is fully off in the ad platform and remove any automated rules still allocating budget.",
      });
    }
  }

  // CHECK 2 — Overspend
  for (const c of campaigns) {
    if (c.budgetTotal <= 0) continue;
    if (c.budgetSpent > c.budgetTotal * 1.1) {
      const pct = Math.round((c.budgetSpent / c.budgetTotal - 1) * 100);
      detected.push({
        type: "OVERSPEND",
        severity: "CRITICAL",
        campaignId: c._id,
        campaignName: c.name,
        platform: c.platform,
        message: `Campaign "${c.name}" overspent by ${pct}% — budgeted ${money(c.budgetTotal)}, spent ${money(c.budgetSpent)}.`,
        suggestedFix: "Lower daily caps, tighten end dates, or shift budget from underperforming sibling campaigns.",
      });
    }
  }

  // CHECK 3 — Creative rejected (stale)
  const staleMs = 48 * 60 * 60 * 1000;
  for (const c of campaigns) {
    if (c.status !== "REJECTED") continue;
    const updated = new Date(c.updatedAt).getTime();
    if (now.getTime() - updated > staleMs) {
      const hoursAgo = Math.round((now.getTime() - updated) / (60 * 60 * 1000));
      detected.push({
        type: "CREATIVE_REJECTED",
        severity: "CRITICAL",
        campaignId: c._id,
        campaignName: c.name,
        platform: c.platform,
        message: `Campaign "${c.name}" creative was rejected ${hoursAgo} hours ago — no replacement uploaded.`,
        suggestedFix: "Upload a compliant creative variant and resubmit, or pause the campaign until assets are fixed.",
      });
    }
  }

  // CHECK 4 — Audience overlap (same platform + region, LIVE)
  const live = campaigns.filter((c) => c.status === "LIVE");
  const byKey = new Map<string, CampaignAttrs[]>();
  for (const c of live) {
    const region = (c.region ?? "").trim() || "unknown";
    const key = `${c.platform}::${region}`;
    const arr = byKey.get(key) ?? [];
    arr.push(c);
    byKey.set(key, arr);
  }
  for (const [, arr] of byKey) {
    if (arr.length < 2) continue;
    const names = arr.map((x) => `"${x.name}"`).join(" and ");
    const msg = `Campaigns ${names} on ${arr[0].platform} targeting the same region — you may be bidding against yourself.`;
    const fix =
      "Consolidate audiences, exclude overlapping ad sets, or shift one campaign to a different objective.";
    for (const c of arr) {
      detected.push({
        type: "AUDIENCE_OVERLAP",
        severity: "WARNING",
        campaignId: c._id,
        campaignName: c.name,
        platform: c.platform,
        message: msg,
        suggestedFix: fix,
      });
    }
  }

  // CHECK 5 — Low CTR vs platform benchmark (LIVE; only when CTR is known & > 0)
  for (const c of live) {
    const th = ctrThresholdPct(c.platform);
    if (c.ctr > 0 && c.ctr < th) {
      detected.push({
        type: "LOW_CTR",
        severity: "WARNING",
        campaignId: c._id,
        campaignName: c.name,
        platform: c.platform,
        message: `Campaign "${c.name}" CTR is ${c.ctr.toFixed(2)}% — below ${c.platform} benchmark of ${th}%.`,
        suggestedFix: "Refresh creatives, tighten placements, or test new primary text and thumbnails.",
      });
    }
  }

  // CHECK 6 — Missing UTM (LIVE)
  for (const c of live) {
    const u = c.utmSource;
    if (u == null || String(u).trim() === "") {
      detected.push({
        type: "MISSING_UTM",
        severity: "WARNING",
        campaignId: c._id,
        campaignName: c.name,
        platform: c.platform,
        message: `Campaign "${c.name}" has no UTM parameters — analytics attribution is broken.`,
        suggestedFix: "Add utm_source, utm_medium, and utm_campaign to landing URLs and store them on the campaign record.",
      });
    }
  }

  // CHECK 7 — Expiring soon (LIVE, end within 3 days)
  for (const c of live) {
    if (!c.endDate) continue;
    const endDay = utcDayStart(new Date(c.endDate));
    if (endDay < todayStart || endDay > in3Days) continue;
    const daysLeft = Math.round(
      (endDay.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)
    );
    detected.push({
      type: "EXPIRING_SOON",
      severity: "INFO",
      campaignId: c._id,
      campaignName: c.name,
      platform: c.platform,
      message: `Campaign "${c.name}" expires in ${daysLeft} day(s) — renew if it's performing well (CTR: ${c.ctr.toFixed(2)}%).`,
      suggestedFix: "Extend the end date or clone the campaign if performance meets your targets.",
    });
  }

  // Upsert alerts + update campaigns
  const byCampaign = new Map<string, DetectedError[]>();
  for (const e of detected) {
    if (e.campaignId) {
      const list = byCampaign.get(e.campaignId) ?? [];
      list.push(e);
      byCampaign.set(e.campaignId, list);
    }
  }

  let aiExplainBudget = 0;
  const MAX_AI_EXPLAIN = 5;

  for (const e of detected) {
    if (!e.campaignId) continue;
    const alertType = errorTypeToAlertType(e.type);
    const title =
      e.type === "DEAD_CAMPAIGN"
        ? "Dead campaign spending"
        : e.type === "OVERSPEND"
          ? "Budget overspend"
          : e.type === "CREATIVE_REJECTED"
            ? "Creative rejected"
            : e.type === "AUDIENCE_OVERLAP"
              ? "Audience overlap"
              : e.type === "LOW_CTR"
                ? "Low CTR"
                : e.type === "MISSING_UTM"
                  ? "Missing UTM"
                  : e.type === "EXPIRING_SOON"
                    ? "Campaign expiring"
                    : "Campaign issue";

    const setDoc: Record<string, unknown> = {
      title,
      message: e.message,
      severity: mapSeverity(e.severity),
      isRead: false,
      createdAt: now,
    };

    if (aiExplainBudget < MAX_AI_EXPLAIN) {
      const ai = await getAIErrorExplanation(
        e.type,
        e.campaignName ?? "Campaign",
        e.platform ?? "",
        e.message,
        organizationId,
      );
      if (ai) {
        setDoc.aiExplanation = ai.explanation;
        setDoc.aiFixSteps = ai.steps;
        aiExplainBudget++;
      }
    }

    await Alert.findOneAndUpdate(
      {
        organizationId,
        campaignId: e.campaignId,
        type: alertType,
      },
      { $set: setDoc },
      { upsert: true }
    );

    await notifyCriticalWhatsAppIfConfigured(organizationId, org, e, alertType);
    await notifyCriticalEmailIfConfigured(organizationId, org, e, title);
  }

  // Reset then set campaign error fields from highest-severity detection per campaign
  await Campaign.updateMany({ organizationId }, { $set: { errorType: "NONE", errorMessage: null } });

  for (const c of campaigns) {
    const list = byCampaign.get(c._id);
    if (!list?.length) continue;
    let best = list[0]!;
    for (const x of list) {
      if (SEVERITY_RANK[x.severity] > SEVERITY_RANK[best.severity]) best = x;
    }
    await Campaign.updateOne(
      { _id: c._id },
      { $set: { errorType: best.type, errorMessage: best.message } }
    );
  }

  return detected;
}
