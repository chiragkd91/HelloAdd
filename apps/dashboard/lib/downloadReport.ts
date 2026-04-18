import type { PdfReportTemplate } from "@/lib/reports/pdfGenerator";

/** Browser download of a report file (uses session cookie). */
export async function downloadReportFile(
  reportId: string,
  format: "csv" | "pdf" | "excel" | "xlsx",
  options?: { pdfTemplate?: PdfReportTemplate },
) {
  const formatParam = format === "excel" ? "xlsx" : format;
  const templateQs =
    format === "pdf" && options?.pdfTemplate === "ceo" ? "&template=ceo" : "";
  const r = await fetch(
    `/api/reports/${encodeURIComponent(reportId)}/download?format=${formatParam}${templateQs}`,
    {
      credentials: "include",
      cache: "no-store",
    },
  );
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(typeof j.error === "string" ? j.error : "Download failed");
  }
  const blob = await r.blob();
  const cd = r.headers.get("Content-Disposition");
  let filename = `report-${reportId}.${
    formatParam === "pdf" ? "pdf" : formatParam === "xlsx" ? "xlsx" : "csv"
  }`;
  if (cd) {
    const star = /filename\*=UTF-8''([^;\s]+)/i.exec(cd);
    const quoted = /filename="([^"]+)"/i.exec(cd);
    const plain = /filename=([^;\s]+)/i.exec(cd);
    const raw = star?.[1] ?? quoted?.[1] ?? plain?.[1];
    if (raw) {
      try {
        filename = decodeURIComponent(raw.replace(/^"|"$/g, ""));
      } catch {
        filename = raw.replace(/^"|"$/g, "");
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
