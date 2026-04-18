"use client";

import { AlertCardsSkeleton } from "@/components/ui/DataSkeletons";
import { Button } from "@/components/ui/Button";
import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import {
  badgeClassForSeverity,
  formatAlertMeta,
  severityBadgeLabel,
} from "@/lib/alertDisplay";
import { useAlerts } from "@/hooks/useAlerts";
import type { ApiAlertItem } from "@/types/alert";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

const FILTERS = ["All", "Critical", "Warning", "Info", "Resolved"] as const;
type Filter = (typeof FILTERS)[number];

function filterAlerts(items: ApiAlertItem[], filter: Filter): ApiAlertItem[] {
  switch (filter) {
    case "All":
      return items.filter((a) => !a.isRead);
    case "Critical":
      return items.filter((a) => !a.isRead && a.severity === "CRITICAL");
    case "Warning":
      return items.filter((a) => !a.isRead && a.severity === "WARNING");
    case "Info":
      return items.filter((a) => !a.isRead && a.severity === "INFO");
    case "Resolved":
      return items.filter((a) => a.isRead);
    default: {
      const _x: never = filter;
      return _x;
    }
  }
}

function ErrorsPageContent() {
  const searchParams = useSearchParams();
  const { alerts, isLoading, error, refresh, markRead } = useAlerts({ max: 200 });
  const [filter, setFilter] = useState<Filter>("All");
  const [tick, setTick] = useState(0);

  const tickRefresh = useCallback(() => {
    setTick((t) => t + 1);
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      refresh();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const issueHighlight = searchParams.get("issue");

  useEffect(() => {
    if (!issueHighlight) return;
    const el = document.getElementById(`error-row-${issueHighlight}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [issueHighlight, tick, alerts]);

  const visibleRows = useMemo(() => filterAlerts(alerts, filter), [alerts, filter]);

  const summary = useMemo(
    () => ({
      critical: alerts.filter((a) => !a.isRead && a.severity === "CRITICAL").length,
      warning: alerts.filter((a) => !a.isRead && a.severity === "WARNING").length,
      info: alerts.filter((a) => !a.isRead && a.severity === "INFO").length,
    }),
    [alerts]
  );

  const onMarkResolved = async (id: string) => {
    try {
      await markRead(id, true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update alert");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">AI Errors</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Issues detected across your campaigns. Refreshes every 5 minutes (last sync: {tick}).
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={tickRefresh}>
          Refresh now
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
          <p className="text-xs font-bold uppercase text-red-800">Critical</p>
          <p className="mt-1 text-3xl font-bold text-red-700">{summary.critical}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-xs font-bold uppercase text-amber-900">Warnings</p>
          <p className="mt-1 text-3xl font-bold text-amber-800">{summary.warning}</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
          <p className="text-xs font-bold uppercase text-sky-900">Info</p>
          <p className="mt-1 text-3xl font-bold text-sky-800">{summary.info}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              filter === f ? "bg-primary text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <AlertCardsSkeleton count={4} />
      ) : (
      <ul className="space-y-4">
        {visibleRows.length === 0 ? (
          <li className="rounded-2xl border border-neutral-200 bg-neutral-50/80 px-5 py-8 text-center text-sm text-neutral-600">
            No issues in this view. Try another filter or refresh.
          </li>
        ) : (
          visibleRows.map((err) => (
            <li
              key={err.id}
              id={`error-row-${err.id}`}
              className={`rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow ${
                issueHighlight === err.id ? "ring-2 ring-primary ring-offset-2" : ""
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-[11px] font-bold uppercase ${badgeClassForSeverity(err.severity, err.isRead)}`}
                  >
                    {severityBadgeLabel(err.severity)}
                  </span>
                  <h2 className="mt-2 text-lg font-bold text-neutral-900">{err.title}</h2>
                  <p className="mt-1 text-sm text-neutral-600">{err.message}</p>
                  {(err.aiExplanation || (err.aiFixSteps && err.aiFixSteps.length > 0)) && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">
                        AI suggested fix
                      </p>
                      {err.aiExplanation && (
                        <p className="mt-2 text-sm leading-relaxed text-emerald-950">{err.aiExplanation}</p>
                      )}
                      {err.aiFixSteps && err.aiFixSteps.length > 0 && (
                        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-emerald-950">
                          {err.aiFixSteps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-neutral-600">{formatAlertMeta(err)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={
                      err.campaignId
                        ? `/campaigns/${encodeURIComponent(err.campaignId)}`
                        : `/campaigns?fromError=${encodeURIComponent(err.id)}`
                    }
                    className={`${buttonVariantStyles.primary} text-xs`.trim()}
                  >
                    Fix
                  </Link>
                  {!err.isRead && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs"
                      onClick={() => void onMarkResolved(err.id)}
                    >
                      Mark resolved
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
      )}
    </div>
  );
}

function ErrorsFallback() {
  return (
    <div className="space-y-8">
      <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    </div>
  );
}

export default function ErrorsPage() {
  return (
    <Suspense fallback={<ErrorsFallback />}>
      <ErrorsPageContent />
    </Suspense>
  );
}
