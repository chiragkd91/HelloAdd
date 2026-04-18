import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";
import { generatePDFReport, pdfAttachmentFilename } from "@/lib/reports/pdfGenerator";
import { loadReportData } from "@/lib/reports/reportData";
import { reportEmailHtml, sendReportEmail } from "@/lib/reports/reportEmail";
import { Organization, OrganizationMember, User } from "@helloadd/database";

export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  if (!process.env.RESEND_API_KEY) {
    return jsonError("Email not configured (RESEND_API_KEY)", 503);
  }

  const org = await Organization.findById(auth.organizationId).lean();
  if (!org) {
    return jsonError("Organization not found", 404);
  }

  const to =
    org.settings?.reportEmail?.trim() ||
    (await (async () => {
      const owner = await OrganizationMember.findOne({
        organizationId: auth.organizationId,
        role: "OWNER",
      }).lean();
      if (!owner) return null;
      const user = await User.findById(owner.userId).select("email").lean();
      return user?.email ?? null;
    })());

  if (!to) {
    return jsonError("Set a report email in Settings → Alerts", 400);
  }

  const now = new Date();
  const dateFrom = new Date(now);
  dateFrom.setUTCDate(dateFrom.getUTCDate() - 7);

  const data = await loadReportData(auth.organizationId, dateFrom, now);
  const pdf = await generatePDFReport(data);

  const owner = await OrganizationMember.findOne({
    organizationId: auth.organizationId,
    role: "OWNER",
  }).lean();
  const user = owner ? await User.findById(owner.userId).lean() : null;
  const firstName = user?.name?.split(/\s+/)[0] ?? "there";

  const baseUrl =
    process.env.NEXT_PUBLIC_DASHBOARD_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3001";

  await sendReportEmail({
    to,
    subject: `Hello Add — Test report — ${org.name}`,
    html: reportEmailHtml({
      name: firstName,
      orgName: org.name,
      summary: {
        totalSpend: data.metrics.totalSpend,
        impressions: data.metrics.totalImpressions,
        avgCTR: data.metrics.avgCTR,
        conversions: data.metrics.totalConversions,
      },
      topPlatform: data.platformBreakdown[0]?.platform ?? "—",
      dashboardUrl: `${baseUrl.replace(/\/$/, "")}/`,
    }),
    pdfBytes: pdf,
    filename: pdfAttachmentFilename(data, "standard"),
  });

  return jsonOk({ ok: true, sentTo: to });
}
