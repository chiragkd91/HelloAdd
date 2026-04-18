"use client";

import { AlertCardsSkeleton } from "@/components/ui/DataSkeletons";
import { badgeClassForSeverity, formatAlertMeta, severityBadgeLabel } from "@/lib/alertDisplay";
import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import { useAlerts } from "@/hooks/useAlerts";
import Link from "next/link";
import toast from "react-hot-toast";
import { useState } from "react";

export function ErrorPanel() {
  const { alerts, isLoading, error, refresh } = useAlerts({ unreadOnly: true, max: 5 });
  const [running, setRunning] = useState(false);

  async function runChecks() {
    setRunning(true);
    try {
      const r = await fetch("/api/errors/detect", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; count?: number };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Checks failed");
        return;
      }
      toast.success(`Checks complete (${typeof j.count === "number" ? j.count : 0} findings)`);
      refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("helloadd:alerts-changed"));
      }
    } catch {
      toast.error("Network error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-neutral-900">AI-detected issues</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={running}
            onClick={() => void runChecks()}
            className={`${buttonVariantStyles.secondary} px-3 py-1.5 text-xs disabled:opacity-60`}
          >
            {running ? "Running…" : "Run checks now"}
          </button>
          <span className="text-xs font-medium text-red-700">{alerts.length} open</span>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-amber-800">
          {error} — showing nothing until the API loads.
        </p>
      )}
      {isLoading ? (
        <div className="mt-6">
          <AlertCardsSkeleton count={3} />
        </div>
      ) : alerts.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-600">
          No open alerts. Run <code className="rounded bg-white/80 px-1">npm run db:seed</code> or check MongoDB.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {alerts.map((err) => (
            <li
              key={err.id}
              className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${badgeClassForSeverity(err.severity, err.isRead)}`}
                  >
                    {severityBadgeLabel(err.severity)}
                  </span>
                  <span className="text-sm font-bold text-neutral-900">{err.title}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-600">{err.message}</p>
                <p className="mt-2 text-[11px] text-neutral-600">{formatAlertMeta(err)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/errors?issue=${encodeURIComponent(err.id)}`}
                  className={`${buttonVariantStyles.primary} px-4 py-2 text-xs`.trim()}
                >
                  Fix now
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
