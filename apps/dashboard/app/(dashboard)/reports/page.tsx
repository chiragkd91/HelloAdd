"use client";

import { ChartInnerSkeleton, ReportListSkeleton } from "@/components/ui/DataSkeletons";
import { Button } from "@/components/ui/Button";
import { useDashboardFilters } from "@/components/layout/DashboardFiltersContext";
import { platformLabel } from "@/lib/campaignDisplay";
import { downloadReportFile } from "@/lib/downloadReport";
import {
  REPORT_TYPE_API,
  type DateRangePreset,
  type ReportTypeLabel,
  dateRangeFromPreset,
} from "@/lib/reports";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReportGenerate } from "@/hooks/useReportGenerate";
import { useReportsList } from "@/hooks/useReportsList";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo, useState } from "react";

const REPORT_LABELS = Object.keys(REPORT_TYPE_API) as ReportTypeLabel[];

const RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "quarter", label: "This quarter" },
  { value: "ytd", label: "Year to date" },
];

export default function ReportsPage() {
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const { platform: headerPlatform } = useDashboardFilters();
  const [reportLabel, setReportLabel] = useState<ReportTypeLabel>("Monthly Overview");
  const [rangePreset, setRangePreset] = useState<DateRangePreset>("30d");
  const [lastGen, setLastGen] = useState<{ reportId: string; message?: string } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { analyticsDays } = useMemo(() => dateRangeFromPreset(rangePreset), [rangePreset]);
  const { data: analyticsData, isLoading: chartLoading, error: chartError } = useAnalytics({
    days: analyticsDays,
    platform: headerPlatform || undefined,
  });

  const { generate, pending, lastError, clearError } = useReportGenerate();
  const { items: recentReports, isLoading: listLoading, error: listError, refresh: refreshReports } =
    useReportsList();

  const chartRows = useMemo(() => {
    if (!analyticsData?.byPlatform) return [];
    return Object.entries(analyticsData.byPlatform).map(([key, v]) => ({
      name: platformLabel(key),
      spend: v.spend,
    }));
  }, [analyticsData]);

  async function runGenerate() {
    clearError();
    setDownloadError(null);
    const { dateFrom, dateTo } = dateRangeFromPreset(rangePreset);
    const result = await generate({
      reportType: REPORT_TYPE_API[reportLabel],
      dateFrom,
      dateTo,
    });
    if (result) {
      setLastGen({ reportId: result.reportId, message: result.message });
      void refreshReports();
    }
    return result;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Reports</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Generate PDF, Excel (.xlsx), or CSV exports from your campaign data.
        </p>
      </div>

      {lastError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {lastError}
        </div>
      )}
      {downloadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {downloadError}
        </div>
      )}

      {lastGen && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-neutral-800">
          <p className="font-semibold text-neutral-900">Report saved</p>
          <p className="mt-1 font-mono text-xs text-neutral-600">ID: {lastGen.reportId}</p>
          {lastGen.message && <p className="mt-2 text-xs text-neutral-600">{lastGen.message}</p>}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Generate report</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Report type
            <select
              value={reportLabel}
              onChange={(e) => setReportLabel(e.target.value as ReportTypeLabel)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            >
              {REPORT_LABELS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Date range
            <select
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value as DateRangePreset)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" disabled={pending} onClick={() => void runGenerate()}>
            {pending ? "Working…" : "Generate & save"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={async () => {
              const r = await runGenerate();
              if (!r) return;
              try {
                await downloadReportFile(r.reportId, "pdf");
              } catch (e) {
                setDownloadError(e instanceof Error ? e.message : "PDF download failed");
              }
            }}
          >
            Export PDF
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            title="3-page leadership snapshot: headline KPIs, takeaways, condensed tables"
            onClick={async () => {
              const r = await runGenerate();
              if (!r) return;
              try {
                await downloadReportFile(r.reportId, "pdf", { pdfTemplate: "ceo" });
              } catch (e) {
                setDownloadError(e instanceof Error ? e.message : "CEO PDF download failed");
              }
            }}
          >
            CEO PDF
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={async () => {
              const r = await runGenerate();
              if (!r) return;
              try {
                await downloadReportFile(r.reportId, "excel");
              } catch (e) {
                setDownloadError(e instanceof Error ? e.message : "Export failed");
              }
            }}
          >
            Export Excel (.xlsx)
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={async () => {
              const r = await runGenerate();
              if (!r) return;
              const text = `Hello Add — ${reportLabel}. Report ID: ${r.reportId}. Download from Reports in the dashboard.`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
            }}
          >
            Share via WhatsApp
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={async () => {
              const r = await runGenerate();
              if (!r) return;
              const subject = encodeURIComponent(`Hello Add report ${r.reportId}`);
              const body = encodeURIComponent(
                `Report: ${reportLabel}\nReport ID: ${r.reportId}\n\n— Sent from Hello Add dashboard`
              );
              window.location.href = `mailto:?subject=${subject}&body=${body}`;
            }}
          >
            Email to CEO
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-neutral-900">Recent reports</h2>
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => void refreshReports()}
          >
            Refresh
          </button>
        </div>
        {listError && (
          <p className="mt-2 text-sm text-amber-800">{listError}</p>
        )}
        {listLoading ? (
          <ReportListSkeleton />
        ) : recentReports.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">No saved reports yet. Generate one above.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {recentReports.map((rep) => (
              <li key={rep.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-neutral-900">{rep.reportType}</p>
                  <p className="font-mono text-xs text-neutral-600">{rep.id}</p>
                  <p className="text-xs text-neutral-600">
                    {new Date(rep.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="!py-1.5 !text-xs"
                    onClick={async () => {
                      setDownloadError(null);
                      try {
                        await downloadReportFile(rep.id, "pdf");
                      } catch (e) {
                        setDownloadError(e instanceof Error ? e.message : "PDF download failed");
                      }
                    }}
                  >
                    PDF
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!py-1.5 !text-xs"
                    title="Executive briefing layout"
                    onClick={async () => {
                      setDownloadError(null);
                      try {
                        await downloadReportFile(rep.id, "pdf", { pdfTemplate: "ceo" });
                      } catch (e) {
                        setDownloadError(e instanceof Error ? e.message : "CEO PDF download failed");
                      }
                    }}
                  >
                    CEO
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!py-1.5 !text-xs"
                    onClick={async () => {
                      setDownloadError(null);
                      try {
                        await downloadReportFile(rep.id, "excel");
                      } catch (e) {
                        setDownloadError(e instanceof Error ? e.message : "Download failed");
                      }
                    }}
                  >
                    Excel
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-neutral-900">Preview — spend by platform</h2>
          <span className="text-xs text-neutral-600">
            {chartLoading ? "Loading…" : chartError ? "API error" : "Live data"}
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          Report window: last {analyticsDays} days
          {headerPlatform ? ` · platform ${platformLabel(headerPlatform)}` : ""}. Sanity-check before exporting.
        </p>
        {chartError && (
          <p className="mt-2 text-sm text-amber-800">{chartError}</p>
        )}
        <div className="mt-4 w-full min-w-0">
          {chartLoading ? (
            <ChartInnerSkeleton className={isMdUp ? "h-72" : "h-48"} />
          ) : chartRows.length === 0 ? (
            <div
              className={`flex items-center justify-center text-sm text-neutral-600 ${isMdUp ? "h-72" : "h-48"}`}
            >
              No platform spend data — connect campaigns or run db:seed.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMdUp ? 288 : 192}>
              <BarChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Spend"]} />
                <Bar dataKey="spend" fill="#6845ab" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
