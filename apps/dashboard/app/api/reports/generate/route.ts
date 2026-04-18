import { Report } from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

const bodySchema = z.object({
  reportType: z.enum([
    "weekly_summary",
    "monthly_overview",
    "campaign_performance",
    "platform_comparison",
    "ceo_executive",
  ]),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

/**
 * Creates a persisted report record; downloads are generated on demand from live campaign data.
 * Dedup: same org + reportType + date range within 5 minutes reuses existing Report (Task 1.1).
 */
function reportDownloadPath(reportId: string): string {
  return `/api/reports/${encodeURIComponent(reportId)}/download?format=pdf`;
}
export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const dateFrom = parsed.data.dateFrom ? new Date(parsed.data.dateFrom) : null;
  const dateTo = parsed.data.dateTo ? new Date(parsed.data.dateTo) : null;

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const existing = await Report.findOne({
    organizationId: auth.organizationId,
    reportType: parsed.data.reportType,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
    createdAt: { $gte: fiveMinAgo },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (existing) {
    return jsonOk({
      reportId: existing._id,
      downloadUrl: reportDownloadPath(existing._id),
      status: "ready",
      organizationId: auth.organizationId,
      reportType: parsed.data.reportType,
      message: "Reusing a report created in the last 5 minutes — same type and date range.",
      deduplicated: true,
    });
  }

  const created = await Report.create({
    organizationId: auth.organizationId,
    reportType: parsed.data.reportType,
    status: "READY",
    dateFrom,
    dateTo,
  });

  const reportId = created._id;

  return jsonOk({
    reportId,
    downloadUrl: reportDownloadPath(reportId),
    status: "ready",
    organizationId: auth.organizationId,
    reportType: parsed.data.reportType,
    message: "Report saved. Use Export PDF / Excel to download.",
    deduplicated: false,
  });
}
