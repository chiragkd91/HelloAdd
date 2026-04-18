import ExcelJS from "exceljs";
import type { CampaignAttrs } from "@helloadd/database";
import type { DailyMetricRow, ReportData } from "@/lib/reports/reportData";

const PRIMARY = "FF6845AB";
const LIGHT = "FFF9FAFB";

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function statusFill(status: string): ExcelJS.Fill {
  switch (status) {
    case "LIVE":
      return { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
    case "PAUSED":
      return { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    case "ENDED":
      return { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
    case "REJECTED":
      return { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECACA" } };
    default:
      return { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
  }
}

/**
 * Multi-sheet .xlsx workbook (Summary, Campaigns, Platform Summary, Daily Metrics).
 */
export async function generateExcelReport(
  data: ReportData,
  dailyRows: DailyMetricRow[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Hello Add";

  // —— Sheet 1: Summary
  const s1 = wb.addWorksheet("Summary", {
    views: [{ showGridLines: true }],
  });
  s1.mergeCells("A1:F1");
  const t1 = s1.getCell("A1");
  t1.value = "Hello Add — Campaign Performance Report";
  t1.font = { bold: true, size: 16 };
  s1.getRow(1).height = 24;
  s1.getCell("A2").value = data.organizationName;
  s1.getCell("A3").value = `Date range: ${data.dateFrom} → ${data.dateTo}`;
  s1.getCell("A5").value = "Total Spend";
  s1.getCell("B5").value = money(data.metrics.totalSpend);
  s1.getCell("A6").value = "Total Impressions";
  s1.getCell("B6").value = data.metrics.totalImpressions.toLocaleString("en-IN");
  s1.getCell("A7").value = "Average CTR";
  s1.getCell("B7").value = `${data.metrics.avgCTR.toFixed(2)}%`;
  s1.getCell("A8").value = "Total Conversions";
  s1.getCell("B8").value = data.metrics.totalConversions;
  s1.getColumn(1).width = 22;
  s1.getColumn(2).width = 22;

  // —— Sheet 2: Campaigns
  const s2 = wb.addWorksheet("Campaigns");
  const headers = [
    "Campaign Name",
    "Platform",
    "Product",
    "Status",
    "Start Date",
    "End Date",
    "Budget",
    "Spend",
    "Impressions",
    "Clicks",
    "CTR",
    "Conversions",
    "Region",
    "Error",
  ];
  const hr = s2.addRow(headers);
  hr.font = { bold: true, color: { argb: "FFFFFFFF" } };
  hr.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY } };
  });
  hr.height = 22;

  data.campaigns.forEach((c: CampaignAttrs, i: number) => {
    const row = s2.addRow([
      c.name,
      c.platform,
      c.product ?? "",
      c.status,
      c.startDate instanceof Date ? c.startDate.toISOString().slice(0, 10) : String(c.startDate),
      c.endDate ? (c.endDate instanceof Date ? c.endDate.toISOString().slice(0, 10) : String(c.endDate)) : "",
      money(c.budgetTotal),
      money(c.budgetSpent),
      c.impressions,
      c.clicks,
      c.ctr / 100,
      c.conversions,
      c.region ?? "",
      c.errorType,
    ]);
    row.getCell(4).fill = statusFill(c.status);
    row.getCell(11).numFmt = "0.00%";
    const bg = i % 2 === 0 ? "FFFFFFFF" : LIGHT;
    row.eachCell((cell, colNumber) => {
      if (colNumber !== 4) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      }
    });
  });

  s2.getColumn(1).width = 30;
  s2.getColumn(2).width = 12;
  s2.getColumn(4).width = 10;
  s2.getColumn(5).width = 12;
  s2.getColumn(6).width = 12;
  s2.getColumn(7).width = 14;
  s2.getColumn(8).width = 14;
  s2.getColumn(9).width = 14;
  s2.getColumn(10).width = 10;
  s2.getColumn(11).width = 10;
  s2.getColumn(12).width = 12;
  s2.getColumn(13).width = 14;
  s2.getColumn(14).width = 18;

  // —— Sheet 3: Platform Summary
  const s3 = wb.addWorksheet("Platform Summary");
  const ph = s3.addRow([
    "Platform",
    "Campaigns",
    "Total Spend",
    "Impressions",
    "Clicks",
    "Avg CTR",
    "Conversions",
  ]);
  ph.font = { bold: true, color: { argb: "FFFFFFFF" } };
  ph.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY } };
  });
  let tSpend = 0;
  let tImp = 0;
  let tClk = 0;
  let tConv = 0;
  for (const p of data.platformBreakdown) {
    tSpend += p.totalSpend;
    tImp += p.impressions;
    tClk += p.clicks;
    tConv += p.conversions;
    const r = s3.addRow([
      p.platform,
      p.campaigns,
      p.totalSpend,
      p.impressions,
      p.clicks,
      p.avgCtr / 100,
      p.conversions,
    ]);
    r.getCell(6).numFmt = "0.00%";
  }
  const tr = s3.addRow(["Totals", "", tSpend, tImp, tClk, "", tConv]);
  tr.font = { bold: true };

  s3.getColumn(1).width = 14;
  s3.getColumn(3).width = 14;

  // —— Sheet 4: Daily Metrics
  const s4 = wb.addWorksheet("Daily Metrics");
  const dh = s4.addRow([
    "Date",
    "Facebook Spend",
    "Google Spend",
    "LinkedIn Spend",
    "Total Spend",
    "Total Clicks",
    "Total Impressions",
  ]);
  dh.font = { bold: true };
  for (const d of dailyRows) {
    s4.addRow([
      d.date,
      d.facebookSpend,
      d.googleSpend,
      d.linkedinSpend,
      d.totalSpend,
      d.totalClicks,
      d.totalImpressions,
    ]);
  }
  s4.getColumn(1).width = 14;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
