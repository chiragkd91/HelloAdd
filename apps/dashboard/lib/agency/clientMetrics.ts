import type { CampaignAttrs } from "@helloadd/database";

export function countCampaignsByStatus(campaigns: Pick<CampaignAttrs, "status">[]) {
  let live = 0;
  let paused = 0;
  let ended = 0;
  let draft = 0;
  let other = 0;
  for (const c of campaigns) {
    switch (c.status) {
      case "LIVE":
        live += 1;
        break;
      case "PAUSED":
        paused += 1;
        break;
      case "ENDED":
        ended += 1;
        break;
      case "DRAFT":
        draft += 1;
        break;
      default:
        other += 1;
    }
  }
  return {
    live,
    paused,
    ended,
    draft,
    other,
    total: campaigns.length,
  };
}

export function aggregateCampaignMetrics(campaigns: Pick<CampaignAttrs, "budgetSpent" | "clicks" | "impressions" | "conversions" | "ctr" | "platform" | "errorType">[]) {
  let totalSpend = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalLeads = 0;
  let issueCount = 0;
  const byPlatform = new Map<
    string,
    { spend: number; impressions: number; clicks: number; ctrSum: number; n: number }
  >();

  for (const c of campaigns) {
    totalSpend += c.budgetSpent ?? 0;
    totalImpressions += c.impressions ?? 0;
    totalClicks += c.clicks ?? 0;
    totalLeads += c.conversions ?? 0;
    if (c.errorType && c.errorType !== "NONE") {
      issueCount += 1;
    }
    const p = c.platform;
    const cur = byPlatform.get(p) ?? { spend: 0, impressions: 0, clicks: 0, ctrSum: 0, n: 0 };
    cur.spend += c.budgetSpent ?? 0;
    cur.impressions += c.impressions ?? 0;
    cur.clicks += c.clicks ?? 0;
    cur.ctrSum += c.ctr ?? 0;
    cur.n += 1;
    byPlatform.set(p, cur);
  }

  const avgCTR =
    totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : campaigns.length ? totalClicks / campaigns.length : 0;

  const platforms = [...byPlatform.entries()].map(([platform, v]) => ({
    platform,
    spend: v.spend,
    ctr: v.n > 0 ? v.ctrSum / v.n : 0,
  }));

  return { totalSpend, totalLeads, avgCTR, issueCount, platforms };
}

export function healthLabelToBadge(
  label: string | null | undefined,
): "Healthy" | "Warning" | "Critical" {
  if (label === "CRITICAL") return "Critical";
  if (label === "WARNING") return "Warning";
  return "Healthy";
}
