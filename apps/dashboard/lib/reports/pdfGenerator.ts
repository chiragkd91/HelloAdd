import { PDFDocument, PDFPage, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { generateReportSummary } from "@/lib/ai/reportSummarizer";
import type { ReportData } from "@/lib/reports/reportData";

const W = 595.28;
const H = 841.89;
const M = 48;
const HEADER_H = 60;
/** Keep body above this y (pdf origin bottom-left) so footers never overlap. */
const MIN_CONTENT_Y = 112;

const GREEN = rgb(22 / 255, 163 / 255, 74 / 255);
const DARK = rgb(17 / 255, 24 / 255, 39 / 255);
const GRAY = rgb(107 / 255, 114 / 255, 128 / 255);
const LIGHT = rgb(249 / 255, 250 / 255, 251 / 255);
const BORDER = rgb(229 / 255, 231 / 255, 235 / 255);
const WHITE = rgb(1, 1, 1);

export type PdfReportTemplate = "standard" | "ceo";

function filenameSafeSlug(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60).toLowerCase() || "org";
}

/**
 * Download filenames per TASK 4.1:
 * Standard: `helloadd-{orgSlug}-{month}-{year}.pdf`
 * Executive: `helloadd-{orgSlug}-{month}-{year}-executive.pdf`
 */
export function pdfAttachmentFilename(data: ReportData, template: PdfReportTemplate): string {
  const slug = filenameSafeSlug(data.organizationSlug);
  try {
    const d = new Date(data.dateTo + "T12:00:00.000Z");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    if (template === "ceo") {
      return `helloadd-${slug}-${month}-${year}-executive.pdf`;
    }
    return `helloadd-${slug}-${month}-${year}.pdf`;
  } catch {
    return template === "ceo" ? `helloadd-${slug}-executive.pdf` : `helloadd-${slug}.pdf`;
  }
}

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatRangeHuman(dateFrom: string, dateTo: string): string {
  try {
    const a = new Date(dateFrom + "T12:00:00.000Z");
    const b = new Date(dateTo + "T12:00:00.000Z");
    const o: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
    return `${a.toLocaleDateString("en-IN", o)} – ${b.toLocaleDateString("en-IN", o)}`;
  } catch {
    return `${dateFrom} – ${dateTo}`;
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxW) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w.length > 80 ? `${w.slice(0, 77)}…` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function contentStartY(): number {
  return H - HEADER_H - 28;
}

function drawPageHeader(page: PDFPage, fontBold: PDFFont, font: PDFFont): void {
  page.drawRectangle({ x: 0, y: H - HEADER_H, width: W, height: HEADER_H, color: GREEN });
  page.drawText("Hello Add", {
    x: M,
    y: H - 40,
    size: 24,
    font: fontBold,
    color: WHITE,
  });
  const sub = "helloadd.com";
  const sw = font.widthOfTextAtSize(sub, 12);
  page.drawText(sub, { x: W - M - sw, y: H - 38, size: 12, font, color: WHITE });
}

function drawFootersOnAllPages(doc: PDFDocument, font: PDFFont): void {
  const pages = doc.getPages();
  const total = pages.length;
  for (let i = 0; i < total; i++) {
    const page = pages[i]!;
    const fy = 38;
    page.drawLine({
      start: { x: M, y: fy + 28 },
      end: { x: W - M, y: fy + 28 },
      thickness: 0.75,
      color: GREEN,
    });
    const text = `Confidential — Hello Add · Page ${i + 1} of ${total}`;
    const tw = font.widthOfTextAtSize(text, 9);
    page.drawText(text, { x: (W - tw) / 2, y: fy, size: 9, font, color: GRAY });
  }
}

function drawTextRight(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  size: number,
  font: PDFFont,
  color = DARK,
): void {
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - tw, y, size, font, color });
}

function drawKpiBox(
  page: PDFPage,
  x: number,
  yTop: number,
  bw: number,
  bh: number,
  label: string,
  value: string,
  font: PDFFont,
  fontBold: PDFFont,
): void {
  page.drawRectangle({
    x,
    y: yTop - bh,
    width: bw,
    height: bh,
    color: LIGHT,
    borderColor: BORDER,
    borderWidth: 0.5,
  });
  page.drawRectangle({ x, y: yTop - bh, width: 4, height: bh, color: GREEN });
  page.drawText(label, { x: x + 12, y: yTop - 22, size: 10, font, color: GRAY });
  const vSize = value.length > 14 ? 16 : 22;
  page.drawText(value, { x: x + 12, y: yTop - 52, size: vSize, font: fontBold, color: DARK });
}

/**
 * Multi-page branded PDF (cover, summary, platform table, top campaigns, next steps).
 */
async function generatePDFReportStandard(data: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let aiSummary: Awaited<ReturnType<typeof generateReportSummary>> | null = null;
  try {
    aiSummary = await generateReportSummary(data.organizationId, data, data.organizationName);
  } catch (e) {
    console.warn("[pdf] AI report summary skipped", e);
  }

  const rangeLabel = formatRangeHuman(data.dateFrom, data.dateTo);
  const topPlat = data.platformBreakdown[0]?.platform ?? "your top platform";
  const topCtr = data.platformBreakdown[0]?.avgCtr ?? data.metrics.avgCTR;

  // —— Page 1: Cover + KPI grid 3×2
  let page = doc.addPage([W, H]);
  drawPageHeader(page, fontBold, font);
  let y = contentStartY();
  page.drawText("Campaign Performance Report", {
    x: M,
    y,
    size: 24,
    font: fontBold,
    color: DARK,
  });
  y -= 36;
  page.drawText(data.organizationName, { x: M, y, size: 18, font, color: DARK });
  y -= 28;
  page.drawText(rangeLabel, { x: M, y, size: 14, font, color: GRAY });
  y -= 36;

  const gap = 10;
  const boxW = (W - 2 * M - 2 * gap) / 3;
  const boxH = 78;
  const kpis: [string, string][] = [
    ["Total Spend", money(data.metrics.totalSpend)],
    ["Total Impressions", data.metrics.totalImpressions.toLocaleString("en-IN")],
    ["Average CTR", `${data.metrics.avgCTR.toFixed(2)}%`],
    ["Total Conversions", String(data.metrics.totalConversions)],
    ["Campaigns", String(data.campaigns.length)],
    ["Platforms", String(data.platformBreakdown.length)],
  ];
  const gridTop = y;
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x0 = M + col * (boxW + gap);
    const yTop = gridTop - row * (boxH + gap);
    drawKpiBox(page, x0, yTop, boxW, boxH, kpis[i][0], kpis[i][1], font, fontBold);
  }
  y = gridTop - 2 * (boxH + gap) - 24;

  page.drawText("Confidential — Generated by Hello Add · helloadd.com", {
    x: M,
    y: 108,
    size: 10,
    font,
    color: GRAY,
  });

  // —— Page 2: Executive summary
  page = doc.addPage([W, H]);
  drawPageHeader(page, fontBold, font);
  y = contentStartY();
  page.drawRectangle({ x: M - 4, y: y - 28, width: 4, height: 28, color: GREEN });
  page.drawText("Executive Summary", { x: M + 8, y: y - 4, size: 16, font: fontBold, color: DARK });
  y -= 48;
  const summaryText = `This period your top platform was ${topPlat} with ${topCtr.toFixed(2)}% CTR. ${data.campaigns.length} campaigns ran across ${data.platformBreakdown.length} platforms.`;
  for (const line of wrapText(summaryText, font, 11, W - 2 * M)) {
    page.drawText(line, { x: M, y, size: 11, font, color: DARK });
    y -= 14;
  }
  if (aiSummary?.executiveSummary) {
    y -= 8;
    page.drawText("AI executive summary", { x: M, y, size: 11, font: fontBold, color: GREEN });
    y -= 16;
    for (const line of wrapText(aiSummary.executiveSummary, font, 10, W - 2 * M)) {
      page.drawText(line, { x: M, y, size: 10, font, color: DARK });
      y -= 13;
    }
  }

  // —— Platform breakdown table
  const colRight = [0, 158, 248, 338, 408, 478, W - M - 4];
  const headerH = 24;
  const dataRowH = 20;

  page = doc.addPage([W, H]);
  drawPageHeader(page, fontBold, font);
  y = contentStartY();
  page.drawText("Platform Breakdown", { x: M, y, size: 16, font: fontBold, color: DARK });
  y -= 32;

  const drawTableHeader = (p: PDFPage, yy: number) => {
    p.drawRectangle({ x: M, y: yy - headerH, width: W - 2 * M, height: headerH, color: GREEN });
    p.drawText("Platform", { x: M + 4, y: yy - 16, size: 10, font: fontBold, color: WHITE });
    drawTextRight(p, "Campaigns", colRight[1], yy - 16, 10, fontBold, WHITE);
    drawTextRight(p, "Spend", colRight[2], yy - 16, 10, fontBold, WHITE);
    drawTextRight(p, "Impr.", colRight[3], yy - 16, 10, fontBold, WHITE);
    drawTextRight(p, "Clicks", colRight[4], yy - 16, 10, fontBold, WHITE);
    drawTextRight(p, "CTR", colRight[5], yy - 16, 10, fontBold, WHITE);
    drawTextRight(p, "Conv.", colRight[6], yy - 16, 10, fontBold, WHITE);
  };

  drawTableHeader(page, y);
  y -= headerH + 4;

  let rowIdx = 0;
  let totalSpend = 0;
  let totalImp = 0;
  let totalClk = 0;
  let totalConv = 0;

  const drawRow = (
    p: PDFPage,
    yy: number,
    cells: string[],
    isAlt: boolean,
  ) => {
    const bg = isAlt ? LIGHT : rgb(1, 1, 1);
    p.drawRectangle({ x: M, y: yy - dataRowH, width: W - 2 * M, height: dataRowH, color: bg });
    p.drawLine({
      start: { x: M, y: yy - dataRowH },
      end: { x: W - M, y: yy - dataRowH },
      thickness: 0.5,
      color: BORDER,
    });
    p.drawText(cells[0]!.slice(0, 16), { x: M + 4, y: yy - 14, size: 9, font, color: DARK });
    drawTextRight(p, cells[1]!, colRight[1], yy - 14, 9, font);
    drawTextRight(p, cells[2]!, colRight[2], yy - 14, 9, font);
    drawTextRight(p, cells[3]!, colRight[3], yy - 14, 9, font);
    drawTextRight(p, cells[4]!, colRight[4], yy - 14, 9, font);
    drawTextRight(p, cells[5]!, colRight[5], yy - 14, 9, font);
    drawTextRight(p, cells[6]!, colRight[6], yy - 14, 9, font);
  };

  for (const p of data.platformBreakdown) {
    totalSpend += p.totalSpend;
    totalImp += p.impressions;
    totalClk += p.clicks;
    totalConv += p.conversions;
    if (y < MIN_CONTENT_Y + dataRowH) {
      page = doc.addPage([W, H]);
      drawPageHeader(page, fontBold, font);
      y = contentStartY();
      drawTableHeader(page, y);
      y -= headerH + 4;
    }
    drawRow(
      page,
      y,
      [
        p.platform,
        String(p.campaigns),
        money(p.totalSpend),
        p.impressions.toLocaleString("en-IN"),
        String(p.clicks),
        `${p.avgCtr.toFixed(2)}%`,
        String(p.conversions),
      ],
      rowIdx % 2 === 1,
    );
    y -= dataRowH;
    rowIdx++;
  }
  if (y < MIN_CONTENT_Y + 24) {
    page = doc.addPage([W, H]);
    drawPageHeader(page, fontBold, font);
    y = contentStartY();
  }
  page.drawText("Totals", { x: M + 4, y: y - 12, size: 10, font: fontBold, color: DARK });
  drawTextRight(page, money(totalSpend), colRight[2], y - 12, 10, fontBold);
  drawTextRight(page, totalImp.toLocaleString("en-IN"), colRight[3], y - 12, 10, fontBold);
  drawTextRight(page, String(totalClk), colRight[4], y - 12, 10, fontBold);
  drawTextRight(page, String(totalConv), colRight[6], y - 12, 10, fontBold);

  // —— Top campaigns
  const tcRight = [0, 200, 280, 360, 430, 500, W - M - 4];
  page = doc.addPage([W, H]);
  drawPageHeader(page, fontBold, font);
  y = contentStartY();
  page.drawText("Top Campaigns by CTR", { x: M, y, size: 16, font: fontBold, color: DARK });
  y -= 30;
  page.drawRectangle({ x: M, y: y - headerH, width: W - 2 * M, height: headerH, color: GREEN });
  const th = ["Campaign", "Platform", "Status", "Spend", "CTR", "Conv.", "Error"];
  page.drawText(th[0]!, { x: M + 4, y: y - 16, size: 10, font: fontBold, color: WHITE });
  drawTextRight(page, th[1]!, tcRight[1], y - 16, 10, fontBold, WHITE);
  drawTextRight(page, th[2]!, tcRight[2], y - 16, 10, fontBold, WHITE);
  drawTextRight(page, th[3]!, tcRight[3], y - 16, 10, fontBold, WHITE);
  drawTextRight(page, th[4]!, tcRight[4], y - 16, 10, fontBold, WHITE);
  drawTextRight(page, th[5]!, tcRight[5], y - 16, 10, fontBold, WHITE);
  drawTextRight(page, th[6]!, tcRight[6], y - 16, 10, fontBold, WHITE);
  y -= headerH + 4;

  let ti = 0;
  for (const c of data.topByCtr.slice(0, 5)) {
    if (y < MIN_CONTENT_Y + dataRowH) {
      page = doc.addPage([W, H]);
      drawPageHeader(page, fontBold, font);
      y = contentStartY();
    }
    const err = c.errorType === "NONE" ? "—" : c.errorType;
    const rowBg = ti % 2 === 0 ? rgb(1, 1, 1) : LIGHT;
    page.drawRectangle({ x: M, y: y - dataRowH, width: W - 2 * M, height: dataRowH, color: rowBg });
    page.drawLine({
      start: { x: M, y: y - dataRowH },
      end: { x: W - M, y: y - dataRowH },
      thickness: 0.5,
      color: BORDER,
    });
    page.drawText(c.name.slice(0, 24), { x: M + 4, y: y - 14, size: 8, font, color: DARK });
    drawTextRight(page, c.platform.slice(0, 12), tcRight[1], y - 14, 8, font);
    drawTextRight(page, c.status.slice(0, 10), tcRight[2], y - 14, 8, font);
    drawTextRight(page, money(c.budgetSpent), tcRight[3], y - 14, 8, font);
    drawTextRight(page, `${c.ctr.toFixed(2)}%`, tcRight[4], y - 14, 8, font);
    drawTextRight(page, String(c.conversions), tcRight[5], y - 14, 8, font);
    drawTextRight(page, err.slice(0, 12), tcRight[6], y - 14, 8, font);
    y -= dataRowH;
    ti++;
  }

  // —— Next steps
  page = doc.addPage([W, H]);
  drawPageHeader(page, fontBold, font);
  y = contentStartY();
  page.drawText("Next Steps & Recommendations", { x: M, y, size: 16, font: fontBold, color: DARK });
  y -= 32;
  const mergedRecs = [
    ...(aiSummary?.aiGeneratedRecommendations ?? []),
    ...data.recommendations,
  ].slice(0, 12);
  mergedRecs.forEach((rec, i) => {
    const lines = wrapText(`${i + 1}. ${rec}`, font, 11, W - 2 * M - 12);
    for (const ln of lines) {
      if (y < MIN_CONTENT_Y) {
        page = doc.addPage([W, H]);
        drawPageHeader(page, fontBold, font);
        y = contentStartY();
      }
      page.drawText(ln, { x: M + 8, y, size: 11, font, color: DARK });
      y -= 14;
    }
    y -= 8;
  });
  y -= 16;
  if (y < MIN_CONTENT_Y) {
    page = doc.addPage([W, H]);
    drawPageHeader(page, fontBold, font);
    y = contentStartY();
  }
  page.drawText("Disclaimer: Data sourced from connected ad platforms via Hello Add.", {
    x: M,
    y,
    size: 9,
    font,
    color: GRAY,
  });
  y -= 28;
  page.drawText("Hello Add · helloadd.com", { x: M, y, size: 11, font: fontBold, color: GREEN });

  drawFootersOnAllPages(doc, font);
  return doc.save();
}

/**
 * Short “CEO / leadership” deck: same branding, fewer pages, larger KPI tiles.
 */
async function generatePDFReportCeo(data: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const rangeLabel = formatRangeHuman(data.dateFrom, data.dateTo);
  const topPlat = data.platformBreakdown[0]?.platform ?? "your top platform";
  const topCtr = data.platformBreakdown[0]?.avgCtr ?? data.metrics.avgCTR;

  // —— Page 1: Cover
  let page = doc.addPage([W, H]);
  drawPageHeader(page, fontBold, font);
  let y = contentStartY();
  page.drawText("Executive briefing", { x: M, y, size: 11, font, color: GRAY });
  y -= 22;
  page.drawText("Advertising performance snapshot", {
    x: M,
    y,
    size: 22,
    font: fontBold,
    color: DARK,
  });
  y -= 34;
  page.drawText(data.organizationName, { x: M, y, size: 17, font: fontBold, color: DARK });
  y -= 26;
  page.drawText(rangeLabel, { x: M, y, size: 12, font, color: GRAY });
  y -= 32;
  page.drawLine({
    start: { x: M, y },
    end: { x: W - M, y },
    thickness: 1,
    color: GREEN,
  });
  y -= 20;
  page.drawText(
    "Prepared for leadership review · not for external distribution without approval",
    { x: M, y, size: 9, font, color: GRAY },
  );
  y -= 28;
  page.drawText("Confidential — Generated by Hello Add · helloadd.com", {
    x: M,
    y: 108,
    size: 10,
    font,
    color: GRAY,
  });

  // —— Page 2: Hero KPIs 2×2
  page = doc.addPage([W, H]);
  drawPageHeader(page, fontBold, font);
  y = contentStartY();
  page.drawText("At a glance", { x: M, y, size: 18, font: fontBold, color: DARK });
  y -= 38;
  const boxW = (W - 2 * M - 18) / 2;
  const boxH = 88;
  const rowTop = y;
  const kpiDefs: [string, string][] = [
    ["Total spend", money(data.metrics.totalSpend)],
    ["Impressions", data.metrics.totalImpressions.toLocaleString("en-IN")],
    ["Avg. CTR", `${data.metrics.avgCTR.toFixed(2)}%`],
    ["Conversions", String(data.metrics.totalConversions)],
  ];
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const yTop = rowTop - row * (boxH + 18);
    const x0 = M + col * (boxW + 18);
    drawKpiBox(page, x0, yTop, boxW, boxH, kpiDefs[i][0], kpiDefs[i][1], font, fontBold);
  }
  y = rowTop - 2 * (boxH + 18) - 36;
  page.drawText("Key takeaways", { x: M, y, size: 14, font: fontBold, color: DARK });
  y -= 24;
  const bullets: string[] = [
    `Strongest platform in this window: ${topPlat} (period CTR leader ~${topCtr.toFixed(2)}%).`,
    `${data.campaigns.length} campaigns in view across ${data.platformBreakdown.length} platform(s).`,
  ];
  if (data.recommendations[0]) bullets.push(data.recommendations[0]);
  else {
    bullets.push("Open the dashboard for pacing, creative, and audience detail.");
  }
  for (const b of bullets) {
    for (const ln of wrapText(`• ${b}`, font, 11, W - 2 * M - 8)) {
      page.drawText(ln, { x: M + 4, y, size: 11, font, color: DARK });
      y -= 14;
    }
    y -= 6;
  }

  // —— Page 3: Platform + top campaigns
  const colRight = [0, 118, 208, 298, 368, 438, W - M - 4];
  const tcR = [0, 178, 268, 358, 448];
  page = doc.addPage([W, H]);
  drawPageHeader(page, fontBold, font);
  y = contentStartY();
  page.drawText("Platform mix & spotlight", { x: M, y, size: 16, font: fontBold, color: DARK });
  y -= 28;
  const headerH = 24;
  const dataRowH = 18;
  page.drawRectangle({ x: M, y: y - headerH, width: W - 2 * M, height: headerH, color: GREEN });
  const hdr = ["Platform", "Cmps", "Spend", "Impr.", "Clicks", "CTR", "Conv."];
  page.drawText(hdr[0]!, { x: M + 4, y: y - 16, size: 10, font: fontBold, color: WHITE });
  for (let i = 1; i < hdr.length; i++) {
    drawTextRight(page, hdr[i]!, colRight[i]!, y - 16, 10, fontBold, WHITE);
  }
  y -= headerH + 4;
  let rowIdx = 0;
  for (const p of data.platformBreakdown) {
    if (y < MIN_CONTENT_Y + 120) break;
    const bg = rowIdx % 2 === 0 ? rgb(1, 1, 1) : LIGHT;
    page.drawRectangle({ x: M, y: y - dataRowH, width: W - 2 * M, height: dataRowH, color: bg });
    page.drawLine({
      start: { x: M, y: y - dataRowH },
      end: { x: W - M, y: y - dataRowH },
      thickness: 0.5,
      color: BORDER,
    });
    page.drawText(p.platform.slice(0, 14), { x: M + 4, y: y - 12, size: 8, font, color: DARK });
    drawTextRight(page, String(p.campaigns), colRight[1]!, y - 12, 8, font);
    drawTextRight(page, money(p.totalSpend), colRight[2]!, y - 12, 8, font);
    drawTextRight(page, p.impressions.toLocaleString("en-IN"), colRight[3]!, y - 12, 8, font);
    drawTextRight(page, String(p.clicks), colRight[4]!, y - 12, 8, font);
    drawTextRight(page, `${p.avgCtr.toFixed(2)}%`, colRight[5]!, y - 12, 8, font);
    drawTextRight(page, String(p.conversions), colRight[6]!, y - 12, 8, font);
    y -= dataRowH;
    rowIdx++;
  }
  y -= 14;
  page.drawText("Top campaigns (by CTR)", { x: M, y, size: 12, font: fontBold, color: DARK });
  y -= 22;
  page.drawRectangle({ x: M, y: y - 18, width: W - 2 * M, height: 18, color: GREEN });
  const th2 = ["Campaign", "Platform", "Spend", "CTR", "Conv."];
  page.drawText(th2[0]!, { x: M + 4, y: y - 12, size: 8, font: fontBold, color: WHITE });
  for (let i = 1; i < th2.length; i++) {
    drawTextRight(page, th2[i]!, tcR[i]!, y - 12, 8, fontBold, WHITE);
  }
  y -= 22;
  for (const c of data.topByCtr.slice(0, 3)) {
    page.drawRectangle({ x: M, y: y - 14, width: W - 2 * M, height: 14, color: rowIdx % 2 === 0 ? rgb(1, 1, 1) : LIGHT });
    page.drawLine({
      start: { x: M, y: y - 14 },
      end: { x: W - M, y: y - 14 },
      thickness: 0.5,
      color: BORDER,
    });
    page.drawText(c.name.slice(0, 32), { x: M + 4, y: y - 11, size: 7, font, color: DARK });
    drawTextRight(page, c.platform.slice(0, 12), tcR[1]!, y - 11, 7, font);
    drawTextRight(page, money(c.budgetSpent), tcR[2]!, y - 11, 7, font);
    drawTextRight(page, `${c.ctr.toFixed(2)}%`, tcR[3]!, y - 11, 7, font);
    drawTextRight(page, String(c.conversions), tcR[4]!, y - 11, 7, font);
    y -= 16;
    rowIdx++;
  }
  y -= 16;
  page.drawText("Recommended next steps", { x: M, y, size: 12, font: fontBold, color: DARK });
  y -= 18;
  for (const rec of data.recommendations.slice(0, 4)) {
    for (const ln of wrapText(`• ${rec}`, font, 9, W - 2 * M - 8)) {
      page.drawText(ln, { x: M + 4, y, size: 9, font, color: DARK });
      y -= 12;
    }
    y -= 4;
  }
  y -= 6;
  page.drawText(
    "Source: connected ad accounts via Hello Add. Validate material figures in-platform before major decisions.",
    { x: M, y: Math.max(MIN_CONTENT_Y, y), size: 8, font, color: GRAY },
  );

  drawFootersOnAllPages(doc, font);
  return doc.save();
}

export async function generatePDFReport(
  data: ReportData,
  template: PdfReportTemplate = "standard",
): Promise<Uint8Array> {
  if (template === "ceo") {
    return generatePDFReportCeo(data);
  }
  return generatePDFReportStandard(data);
}
