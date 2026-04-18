import { Organization, Report, connectMongo } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonError } from "@/lib/api/http";
import { getClientPortalPayload } from "@/lib/api/clientPortalSession";
import { isClientPortalSectionDisabled } from "@/lib/api/clientPortalSection";
import { campaignsToCsv, loadCampaignRowsForReport } from "@/lib/reportArtifacts";
import { generateExcelReport } from "@/lib/reports/excelGenerator";
import { loadDailyMetricsLast30Days, loadReportData } from "@/lib/reports/reportData";
import { generatePDFReport, pdfAttachmentFilename, type PdfReportTemplate } from "@/lib/reports/pdfGenerator";

function filenameSafe(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
}

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, ctx: Ctx) {
  const p = getClientPortalPayload(req);
  if (!p) {
    return jsonError("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  if (!orgId || orgId !== p.clientOrgId) {
    return jsonError("Forbidden", 403);
  }

  await connectMongo();
  const org = await Organization.findById(orgId).lean();
  if (!org || org.parentAgencyId !== p.agencyOrgId) {
    return jsonError("Not found", 404);
  }

  if (await isClientPortalSectionDisabled(p.agencyOrgId, "reports")) {
    return jsonError("Forbidden", 403);
  }

  const { id } = ctx.params;
  const formatRaw = (url.searchParams.get("format") ?? "csv").toLowerCase();
  const format = formatRaw === "pdf" ? "pdf" : formatRaw === "xlsx" ? "xlsx" : "csv";
  const templateRaw = (url.searchParams.get("template") ?? "standard").toLowerCase();
  const pdfTemplate: PdfReportTemplate = templateRaw === "ceo" ? "ceo" : "standard";

  const report = await Report.findOne({
    _id: id,
    organizationId: orgId,
  }).lean();

  if (!report) {
    return jsonError("Report not found", 404);
  }

  const dateFrom = report.dateFrom ?? null;
  const dateTo = report.dateTo ?? null;

  const rows = await loadCampaignRowsForReport(orgId, dateFrom, dateTo);
  const base = `report-${filenameSafe(report.reportType)}-${report._id}`;

  if (format === "pdf") {
    const data = await loadReportData(orgId, dateFrom, dateTo);
    const pdfName = pdfAttachmentFilename(data, pdfTemplate);
    const buf = await generatePDFReport(data, pdfTemplate);
    return new Response(Buffer.from(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (format === "xlsx") {
    const data = await loadReportData(orgId, dateFrom, dateTo);
    const daily = await loadDailyMetricsLast30Days(orgId);
    const buf = await generateExcelReport(data, daily);
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${base}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const csv = campaignsToCsv(rows);

  return new Response("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
