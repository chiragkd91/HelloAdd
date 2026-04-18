import { Alert, Campaign, Organization, connectMongo, type CampaignAttrs } from "@helloadd/database";

/**
 * Rule-based health score for the current organization (0–100).
 * Persists `aiHealthScore` + `aiHealthLabel` on Organization.
 */
export async function computeAndSaveHealthScore(organizationId: string): Promise<{
  score: number;
  label: "HEALTHY" | "WARNING" | "CRITICAL";
}> {
  await connectMongo();

  const campaigns = (await Campaign.find({ organizationId }).lean()) as CampaignAttrs[];
  const live = campaigns.filter((c) => c.status === "LIVE");
  const avgCtr =
    live.length > 0 ? live.reduce((s, c) => s + c.ctr, 0) / live.length : 0;

  let score = 50;
  if (avgCtr > 2) score += 20;

  const criticalAlerts = await Alert.countDocuments({
    organizationId,
    isRead: false,
    severity: "CRITICAL",
  });
  if (criticalAlerts === 0) score += 15;
  else score -= Math.min(25, criticalAlerts * 10);

  const warningAlerts = await Alert.countDocuments({
    organizationId,
    isRead: false,
    severity: "WARNING",
  });
  score -= Math.min(15, warningAlerts * 5);

  for (const c of live) {
    if (c.budgetTotal > 0 && c.budgetSpent > c.budgetTotal * 1.05) {
      score -= 10;
      break;
    }
  }

  const totalConv = campaigns.reduce((s, c) => s + c.conversions, 0);
  if (totalConv > 10) score += 10;
  else if (totalConv > 0) score += 5;

  score = Math.min(100, Math.max(0, Math.round(score)));

  let label: "HEALTHY" | "WARNING" | "CRITICAL" = "WARNING";
  if (score >= 70) label = "HEALTHY";
  else if (score < 50) label = "CRITICAL";

  await Organization.updateOne(
    { _id: organizationId },
    { $set: { aiHealthScore: score, aiHealthLabel: label } },
  );

  return { score, label };
}
