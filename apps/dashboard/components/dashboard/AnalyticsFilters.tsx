"use client";

import {
  type DashboardRangeDays,
  useDashboardFilters,
} from "@/components/layout/DashboardFiltersContext";
import { BUDGET_PLATFORM_ORDER } from "@/lib/budgetUtils";
import { PLATFORM_OPTIONS, platformLabel } from "@/lib/campaignDisplay";
import { Filter, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const RANGE_OPTIONS: { value: DashboardRangeDays; label: string }[] = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 60, label: "Last 60 days" },
  { value: 90, label: "Last 90 days" },
];

const DEFAULT_RANGE: DashboardRangeDays = 30;

type Props = {
  selectedCtrPlatforms: string[];
  onToggleCtrPlatform: (platformKey: string) => void;
  onClearCtrPlatforms: () => void;
};

export function AnalyticsFilters({
  selectedCtrPlatforms,
  onToggleCtrPlatform,
  onClearCtrPlatforms,
}: Props) {
  const { rangeDays, platform, setRangeDays, setPlatform } = useDashboardFilters();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ctrActive = selectedCtrPlatforms.length > 0;
  const rangeActive = rangeDays !== DEFAULT_RANGE;
  const platformActive = platform !== "";

  const activeCount =
    (rangeActive ? 1 : 0) + (platformActive ? 1 : 0) + (ctrActive ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function clearAll() {
    setRangeDays(DEFAULT_RANGE);
    setPlatform("");
    onClearCtrPlatforms();
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors ${
            open || activeCount > 0
              ? "border-primary/40 bg-primary/10 text-primary ring-1 ring-primary/20"
              : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <Filter className="h-4 w-4 shrink-0" aria-hidden />
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600">
            {rangeActive && (
              <span>
                <span className="font-semibold text-neutral-800">Range:</span> Last {rangeDays} days
              </span>
            )}
            {platformActive && (
              <span>
                <span className="font-semibold text-neutral-800">Platform (API):</span>{" "}
                {platformLabel(platform)}
              </span>
            )}
            {ctrActive && (
              <span>
                <span className="font-semibold text-neutral-800">CTR chart:</span>{" "}
                {selectedCtrPlatforms.map(platformLabel).join(", ")}
              </span>
            )}
            <button
              type="button"
              onClick={() => clearAll()}
              className="font-semibold text-primary hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {mounted &&
        open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[200] bg-black/30 md:bg-black/20"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-label="Filter analytics"
              className="fixed left-1/2 top-[max(1rem,8vh)] z-[201] max-h-[min(calc(100vh-2rem),40rem)] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl"
            >
              <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Filter analytics</h2>
                  <p className="mt-1 text-xs text-neutral-600">
                    Date range and API platform apply to all metrics. CTR chart selection filters the
                    platform bar chart when more than one platform is shown.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  aria-label="Close filters"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">Range</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RANGE_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setRangeDays(o.value)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          rangeDays === o.value
                            ? "bg-primary text-white"
                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">
                    Platform (API)
                  </p>
                  <p className="mt-1 text-xs text-neutral-600">
                    Limits campaign data from the analytics API (same as the header bar).
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPlatform("")}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        platform === ""
                          ? "bg-primary text-white"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      All
                    </button>
                    {PLATFORM_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setPlatform(o.value)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          platform === o.value
                            ? "bg-primary text-white"
                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">
                    CTR chart
                  </p>
                  <p className="mt-1 text-xs text-neutral-600">
                    Toggle which platforms appear in the CTR-by-platform chart. Leave empty to show
                    all platforms.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {BUDGET_PLATFORM_ORDER.map((p) => {
                      const active =
                        selectedCtrPlatforms.length === 0 ? false : selectedCtrPlatforms.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => onToggleCtrPlatform(p)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            selectedCtrPlatforms.length === 0
                              ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                              : active
                                ? "bg-primary text-white"
                                : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {platformLabel(p)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-4">
                <button
                  type="button"
                  onClick={() => clearAll()}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900"
                >
                  Reset to defaults
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary-hover"
                >
                  Done
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
