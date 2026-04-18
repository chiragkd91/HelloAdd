"use client";

import { platformLabel } from "@/lib/campaignDisplay";
import { Filter, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PUBLISHED", label: "Published" },
  { value: "FAILED", label: "Failed" },
  { value: "DRAFT", label: "Draft" },
] as const;

export type SchedulerStatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

type StatusValue = SchedulerStatusFilter;

type Props = {
  status: StatusValue;
  onStatusChange: (value: StatusValue) => void;
  platform: string;
  onPlatformChange: (value: string) => void;
  platformOptions: string[];
  search: string;
  onSearchChange: (value: string) => void;
  onClearAll: () => void;
  /** e.g. Open calendar + New Post links on the same row as Filters */
  trailing?: ReactNode;
};

export function SchedulerFilters({
  status,
  onStatusChange,
  platform,
  onPlatformChange,
  platformOptions,
  search,
  onSearchChange,
  onClearAll,
  trailing,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const statusActive = status !== "ALL";
  const platformActive = platform !== "ALL";

  /** Modal filters only; search stays on the toolbar */
  const activeCount = (statusActive ? 1 : 0) + (platformActive ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const statusSummary =
    STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  function platformSummary(p: string) {
    if (p === "ALL") return "All";
    return platformLabel(p);
  }

  return (
    <div className="relative w-full">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <label
              htmlFor="scheduler-post-search"
              className="shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-600"
            >
              Search
            </label>
            <input
              id="scheduler-post-search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search post content"
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
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600 lg:max-w-[min(100%,24rem)]">
                {statusActive && (
                  <span>
                    <span className="font-semibold text-neutral-800">Status:</span> {statusSummary}
                  </span>
                )}
                {platformActive && (
                  <span>
                    <span className="font-semibold text-neutral-800">Platform:</span>{" "}
                    {platformSummary(platform)}
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

        {trailing ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 min-[480px]:border-t-0 min-[480px]:pt-0 lg:border-l lg:border-t-0 lg:pl-4">
            {trailing}
          </div>
        ) : null}
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
              aria-label="Filter scheduled posts"
              className="fixed left-1/2 top-[max(1rem,8vh)] z-[201] max-h-[min(calc(100vh-2rem),40rem)] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl"
            >
              <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Filter posts</h2>
                  <p className="mt-1 text-xs text-neutral-600">
                    Status and platform are sent to the server. Use Search on the left to filter by content.
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
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">Platform</p>
                  <select
                    value={platform}
                    onChange={(e) => onPlatformChange(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
                  >
                    {platformOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "ALL" ? "All platforms" : platformLabel(option)}
                      </option>
                    ))}
                  </select>
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
