"use client";

import {
  type DashboardRangeDays,
  useDashboardFilters,
} from "@/components/layout/DashboardFiltersContext";
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

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "LIVE", label: "Live" },
  { value: "PAUSED", label: "Paused" },
  { value: "ENDED", label: "Ended" },
  { value: "DRAFT", label: "Draft" },
  { value: "REJECTED", label: "Rejected" },
] as const;

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  product: string;
  onProductChange: (value: string) => void;
  productOptions: string[];
  onClearAll: () => void;
};

export function CampaignsFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  product,
  onProductChange,
  productOptions,
  onClearAll,
}: Props) {
  const { rangeDays, setRangeDays } = useDashboardFilters();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const statusActive = status !== "all";
  const productActive = product !== "all";
  const rangeActive = rangeDays !== DEFAULT_RANGE;

  /** Badge counts only modal filters; search stays on the top bar. */
  const activeCount =
    (statusActive ? 1 : 0) + (productActive ? 1 : 0) + (rangeActive ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const statusLabel =
    STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  return (
    <div className="relative w-full">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <label
            htmlFor="campaign-list-search"
            className="shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-600"
          >
            Search
          </label>
          <input
            id="campaign-list-search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Campaign name…"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 outline-none ring-primary/30 placeholder:text-neutral-600 focus:ring-2"
          />
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`inline-flex h-[42px] shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold shadow-sm transition-colors ${
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
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600 lg:max-w-[min(100%,28rem)]">
              {statusActive && (
                <span>
                  <span className="font-semibold text-neutral-800">Status:</span> {statusLabel}
                </span>
              )}
              {productActive && (
                <span>
                  <span className="font-semibold text-neutral-800">Product:</span> {product}
                </span>
              )}
              {rangeActive && (
                <span>
                  <span className="font-semibold text-neutral-800">Chart range:</span> Last {rangeDays}{" "}
                  days
                </span>
              )}
              <button
                type="button"
                onClick={() => onClearAll()}
                className="font-semibold text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
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
              aria-label="Filter campaigns"
              className="fixed left-1/2 top-[max(1rem,8vh)] z-[201] max-h-[min(calc(100vh-2rem),42rem)] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl"
            >
              <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Filter campaigns</h2>
                  <p className="mt-1 text-xs text-neutral-600">
                    Status, product, and chart range. Use Search on the left to filter by name.
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
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">Status</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => onStatusChange(o.value)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          status === o.value
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
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">Product</p>
                  <select
                    value={product}
                    onChange={(e) => onProductChange(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
                  >
                    {productOptions.map((p) => (
                      <option key={p} value={p}>
                        {p === "all" ? "All products" : p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">
                    Chart range (overview)
                  </p>
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
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-4">
                <button
                  type="button"
                  onClick={() => onClearAll()}
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
