import cron from "node-cron";
import {
  connectMongo,
  Organization,
  OrganizationMember,
  Report,
  User,
} from "@helloadd/database";
import { dashboardPublicBaseUrl } from "@/lib/auth/dashboardBaseUrl";
import { sendWeeklyDigestEmail } from "@/lib/email/sendAlertEmail";
import { buildWeeklyDigestData, getDigestRecipientEmail } from "@/lib/email/weeklyDigestData";
import { generatePDFReport, pdfAttachmentFilename } from "@/lib/reports/pdfGenerator";
import { loadReportData } from "@/lib/reports/reportData";
import { reportEmailHtml, sendReportEmail } from "@/lib/reports/reportEmail";

let started = false;

async function resolveReportRecipient(organizationId: string): Promise<string | null> {
  const org = await Organization.findById(organizationId).lean();
  const explicit = org?.settings?.reportEmail?.trim();
  if (explicit) return explicit;
  const owner = await OrganizationMember.findOne({
    organizationId,
    role: "OWNER",
  }).lean();
  if (!owner) return null;
  const user = await User.findById(owner.userId).select(["email", "name"]).lean();
  return user?.email ?? null;
}

export async function generateAndSendReport(
  organizationId: string,
  reportType: "WEEKLY_SUMMARY" | "MONTHLY_OVERVIEW"
): Promise<void> {
  const to = await resolveReportRecipient(organizationId);
  if (!to) {
    console.warn("[report-scheduler] No report email for org", organizationId);
    return;
  }

  const now = new Date();
  let dateFrom: Date;
  let dateTo: Date;

  if (reportType === "WEEKLY_SUMMARY") {
    dateTo = new Date(now);
    dateFrom = new Date(now);
    dateFrom.setUTCDate(dateFrom.getUTCDate() - 7);
  } else {
    const firstThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    dateTo = new Date(firstThisMonth.getTime() - 1);
    dateFrom = new Date(Date.UTC(dateTo.getUTCFullYear(), dateTo.getUTCMonth(), 1));
  }

  const data = await loadReportData(organizationId, dateFrom, dateTo);
  const pdf = await generatePDFReport(data);

  await Report.create({
    organizationId,
    reportType,
    status: "READY",
    dateFrom,
    dateTo,
  });

  const org = await Organization.findById(organizationId).lean();
  const orgName = org?.name ?? "Your organization";
  const owner = await OrganizationMember.findOne({ organizationId, role: "OWNER" }).lean();
  const user = owner ? await User.findById(owner.userId).lean() : null;
  const firstName = user?.name?.split(/\s+/)[0] ?? "there";

  const dashboardUrl = `${dashboardPublicBaseUrl()}/`;

  const subject =
    reportType === "WEEKLY_SUMMARY"
      ? `Hello Add — Weekly report — ${orgName}`
      : `Hello Add — Monthly report — ${orgName}`;

  const html = reportEmailHtml({
    name: firstName,
    orgName,
    summary: {
      totalSpend: data.metrics.totalSpend,
      impressions: data.metrics.totalImpressions,
      avgCTR: data.metrics.avgCTR,
      conversions: data.metrics.totalConversions,
    },
    topPlatform: data.platformBreakdown[0]?.platform ?? "—",
    dashboardUrl,
  });

  await sendReportEmail({
    to,
    subject,
    html,
    pdfBytes: pdf,
    filename: pdfAttachmentFilename(data, "standard"),
  });
}

/**
 * Scheduled auto-reports (long-lived Node only). Set `ENABLE_REPORT_CRON=true`.
 */
export function startReportCron(): void {
  if (started) return;
  if (process.env.ENABLE_REPORT_CRON !== "true") {
    return;
  }
  started = true;

  cron.schedule("30 3 * * 1", async () => {
    try {
      await connectMongo();
      const orgs = await Organization.find({
        $or: [
          { "settings.weeklyReportEnabled": true },
          { "settings.weeklyReportEnabled": { $exists: false } },
          { settings: { $exists: false } },
        ],
      })
        .select(["_id"])
        .lean();
      for (const o of orgs) {
        try {
          await generateAndSendReport(o._id, "WEEKLY_SUMMARY");
        } catch (e) {
          console.error("[report-cron] weekly", o._id, e);
        }
        try {
          const digest = await buildWeeklyDigestData(o._id);
          if (!digest) continue;
          const to = await getDigestRecipientEmail(o._id);
          if (!to) continue;
          await sendWeeklyDigestEmail(to, digest);
        } catch (e) {
          console.error("[report-cron] weekly-digest", o._id, e);
        }
      }
    } catch (e) {
      console.error("[report-cron] weekly batch", e);
    }
  });

  cron.schedule("30 2 1 * *", async () => {
    try {
      await connectMongo();
      const orgs = await Organization.find({
        $or: [
          { "settings.monthlyReportEnabled": true },
          { "settings.monthlyReportEnabled": { $exists: false } },
          { settings: { $exists: false } },
        ],
      })
        .select(["_id"])
        .lean();
      for (const o of orgs) {
        try {
          await generateAndSendReport(o._id, "MONTHLY_OVERVIEW");
        } catch (e) {
          console.error("[report-cron] monthly", o._id, e);
        }
      }
    } catch (e) {
      console.error("[report-cron] monthly batch", e);
    }
  });
}
