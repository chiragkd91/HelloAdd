"use client";

import { Filter, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const PLATFORMS = ["ALL", "GOOGLE", "FACEBOOK", "INSTAGRAM", "LINKEDIN", "YOUTUBE"] as const;
export type PlatformFilter = (typeof PLATFORMS)[number];

const MARKET_SOURCES = [
  "ALL",
  "Google Ads",
  "Meta Business",
  "LinkedIn Marketing",
  "Think with Google",
  "Industry note",
] as const;
export type MarketSourceFilter = (typeof MARKET_SOURCES)[number];

type Props = {
  platform: PlatformFilter;
  onPlatformChange: (p: PlatformFilter) => void;
  marketSource: MarketSourceFilter;
  onMarketSourceChange: (s: MarketSourceFilter) => void;
};

export function MarketingTrendsFilters({
  platform,
  onPlatformChange,
  marketSource,
  onMarketSourceChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeCount =
    (platform !== "ALL" ? 1 : 0) + (marketSource !== "ALL" ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function clearAll() {
    onPlatformChange("ALL");
    onMarketSourceChange("ALL");
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
            {platform !== "ALL" && (
              <span>
                <span className="font-semibold text-neutral-800">Platform:</span> {platform}
              </span>
            )}
            {marketSource !== "ALL" && (
              <span>
                <span className="font-semibold text-neutral-800">Source:</span> {marketSource}
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
              aria-label="Filter marketing trends"
              className="fixed left-1/2 top-[max(1rem,8vh)] z-[201] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl"
            >
            <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Filter trends</h2>
                <p className="mt-1 text-xs text-neutral-600">
                  Applies to both hashtag and article lists. Choose a platform, a market source, or both.
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
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">Platform</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onPlatformChange(p)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        platform === p ? "bg-primary text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">Market source</p>
                <p className="mt-1 text-xs text-neutral-600">
                  Same publisher labels as Market pulse articles and hashtag tags.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MARKET_SOURCES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onMarketSourceChange(s)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        marketSource === s ? "bg-primary text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-4">
              <button
                type="button"
                onClick={() => clearAll()}
                className="text-xs font-semibold text-neutral-600 hover:text-neutral-900"
              >
                Reset to all
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
