/** Maps UI labels to `POST /api/reports/generate` body.reportType */
export const REPORT_TYPE_API = {
  "Weekly Summary": "weekly_summary",
  "Monthly Overview": "monthly_overview",
  "Campaign Performance": "campaign_performance",
  "Platform Comparison": "platform_comparison",
  "CEO Executive Summary": "ceo_executive",
} as const;

export type ReportTypeLabel = keyof typeof REPORT_TYPE_API;
export type ReportTypeApi = (typeof REPORT_TYPE_API)[ReportTypeLabel];

export type DateRangePreset = "30d" | "quarter" | "ytd";

export function dateRangeFromPreset(preset: DateRangePreset): {
  dateFrom: string;
  dateTo: string;
  /** For `GET /api/analytics?days=` (capped at 90 server-side) */
  analyticsDays: number;
} {
  const end = new Date();
  const start = new Date();

  if (preset === "30d") {
    start.setTime(end.getTime() - 30 * 86400000);
    return {
      dateFrom: start.toISOString(),
      dateTo: end.toISOString(),
      analyticsDays: 30,
    };
  }

  if (preset === "quarter") {
    const q = Math.floor(end.getMonth() / 3);
    start.setFullYear(end.getFullYear(), q * 3, 1);
    start.setHours(0, 0, 0, 0);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    return {
      dateFrom: start.toISOString(),
      dateTo: end.toISOString(),
      analyticsDays: Math.min(90, days),
    };
  }

  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
    analyticsDays: Math.min(90, days),
  };
}
