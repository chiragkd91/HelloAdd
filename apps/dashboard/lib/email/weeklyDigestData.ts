import { Alert, Organization, OrganizationMember, User, connectMongo } from "@helloadd/database";
import { platformLabel } from "@/lib/campaignDisplay";
import type { WeeklyDigestData } from "@/lib/email/sendAlertEmail";
import { loadReportData } from "@/lib/reports/reportData";

function weekOfLabel(from: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  return from.toLocaleDateString("en-IN", opts);
}

/**
 * Recipient for digest & alert emails: explicit alert email → report email → owner email.
 */
export async function getDigestRecipientEmail(organizationId: string): Promise<string | null> {
  await connectMongo();
  const org = await Organization.findById(organizationId).lean();
  const alert = org?.settings?.alertEmail?.trim();
  if (alert) return alert;
  const report = org?.settings?.reportEmail?.trim();
  if (report) return report;
  const owner = await OrganizationMember.findOne({ organizationId, role: "OWNER" }).lean();
  if (!owner) return null;
  const user = await User.findById(owner.userId).select(["email"]).lean();
  return user?.email ?? null;
}

export async function buildWeeklyDigestData(organizationId: string): Promise<WeeklyDigestData | null> {
  await connectMongo();
  const org = await Organization.findById(organizationId).select(["name"]).lean();
  if (!org) return null;

  const now = new Date();
  const dateTo = new Date(now);
  const dateFrom = new Date(now);
  dateFrom.setUTCDate(dateFrom.getUTCDate() - 7);

  const report = await loadReportData(organizationId, dateFrom, dateTo);

  const [critical, warning, info] = await Promise.all([
    Alert.countDocuments({
      organizationId,
      createdAt: { $gte: dateFrom, $lte: dateTo },
      severity: "CRITICAL",
    }),
    Alert.countDocuments({
      organizationId,
      createdAt: { $gte: dateFrom, $lte: dateTo },
      severity: "WARNING",
    }),
    Alert.countDocuments({
      organizationId,
      createdAt: { $gte: dateFrom, $lte: dateTo },
      severity: "INFO",
    }),
  ]);

  const baseUrl =
    process.env.NEXT_PUBLIC_DASHBOARD_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  const dashboardUrl = `${baseUrl.replace(/\/$/, "")}/`;

  return {
    orgName: report.organizationName,
    weekOfLabel: weekOfLabel(dateFrom),
    totalSpend: report.metrics.totalSpend,
    totalLeads: report.metrics.totalConversions,
    avgCtr: report.metrics.avgCTR,
    issuesBySeverity: { critical, warning, info },
    topPlatform: report.platformBreakdown[0]
      ? platformLabel(report.platformBreakdown[0].platform)
      : "—",
    dashboardUrl,
  };
}
