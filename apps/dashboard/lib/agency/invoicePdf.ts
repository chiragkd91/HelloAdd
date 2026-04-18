import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const W = 595.28;
const H = 841.89;
const M = 48;
const GREEN = rgb(22 / 255, 163 / 255, 74 / 255);
const DARK = rgb(17 / 255, 24 / 255, 39 / 255);
const GRAY = rgb(107 / 255, 114 / 255, 128 / 255);

export type InvoicePdfInput = {
  agencyName: string;
  clientName: string;
  clientLines: string[];
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  billingPeriodLabel: string;
  planName: string | null;
  platformSummary: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  footerNote?: string;
};

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmt(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Single-page agency invoice PDF (pdf-lib) — letterhead-style per master prompt 1.5.
 */
export async function buildAgencyInvoicePdfBytes(data: InvoicePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([W, H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = H - M;

  page.drawRectangle({ x: 0, y: H - 72, width: W, height: 72, color: GREEN });
  page.drawText("Hello Add", { x: M, y: H - 44, size: 20, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(data.agencyName, { x: M, y: H - 62, size: 10, font, color: rgb(1, 1, 1) });

  y = H - 100;
  page.drawText("TAX INVOICE", { x: M, y, size: 14, font: fontBold, color: DARK });
  y -= 22;
  page.drawText(`Invoice no. ${data.invoiceNumber}`, { x: M, y, size: 10, font, color: GRAY });
  page.drawText(`Date: ${fmt(data.invoiceDate)}`, { x: W - M - 120, y, size: 10, font, color: GRAY });
  y -= 16;
  page.drawText(`Due: ${fmt(data.dueDate)}`, { x: W - M - 120, y, size: 10, font, color: GRAY });

  y -= 28;
  page.drawText("Bill to", { x: M, y, size: 11, font: fontBold, color: DARK });
  y -= 14;
  page.drawText(data.clientName, { x: M, y, size: 11, font: fontBold, color: DARK });
  y -= 13;
  for (const line of data.clientLines) {
    if (!line.trim()) continue;
    page.drawText(line, { x: M, y, size: 9, font, color: GRAY });
    y -= 12;
  }

  y -= 10;
  const serviceTitle = data.planName
    ? `${data.planName} — Social & ads management — ${data.billingPeriodLabel}`
    : `Services — ${data.billingPeriodLabel}`;
  page.drawText("Services", { x: M, y, size: 11, font: fontBold, color: DARK });
  y -= 14;
  const wrap = (text: string, maxW: number, size: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) <= maxW) cur = next;
      else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  };
  for (const line of wrap(serviceTitle, W - 2 * M, 10)) {
    page.drawText(line, { x: M, y, size: 10, font, color: DARK });
    y -= 12;
  }
  if (data.platformSummary) {
    for (const line of wrap(`Platforms: ${data.platformSummary}`, W - 2 * M, 9)) {
      page.drawText(line, { x: M, y, size: 9, font, color: GRAY });
      y -= 11;
    }
  }

  y -= 16;
  const colR = W - M - 140;
  page.drawText("Subtotal", { x: colR - 80, y, size: 10, font, color: GRAY });
  page.drawText(money(data.amount), { x: colR, y, size: 10, font, color: DARK });
  y -= 14;
  page.drawText(`GST (18%)`, { x: colR - 80, y, size: 10, font, color: GRAY });
  page.drawText(money(data.gstAmount), { x: colR, y, size: 10, font, color: DARK });
  y -= 18;
  page.drawText("Total", { x: colR - 80, y, size: 12, font: fontBold, color: DARK });
  page.drawText(money(data.totalAmount), { x: colR, y, size: 12, font: fontBold, color: GREEN });

  y = 120;
  page.drawText("Payment", { x: M, y, size: 10, font: fontBold, color: DARK });
  y -= 12;
  const pay =
    data.footerNote?.trim() ||
    "UPI / bank transfer — reference invoice number. Questions: billing@helloadd.com";
  for (const line of wrap(pay, W - 2 * M, 9)) {
    page.drawText(line, { x: M, y, size: 9, font, color: GRAY });
    y -= 11;
  }

  y = 40;
  page.drawText("Powered by Hello Add", { x: M, y, size: 8, font, color: rgb(0.6, 0.6, 0.6) });

  return doc.save();
}
