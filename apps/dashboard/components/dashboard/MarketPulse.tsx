"use client";

import Link from "next/link";
import { ExternalLink, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

export type MarketTrendItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  platforms: string[];
  industries?: string[];
  relevanceScore: number;
  publishedAt: string;
};

type ApiResponse = {
  items: MarketTrendItem[];
  source?: string;
  degraded?: boolean;
};

export function MarketPulse({
  compact = false,
  platformFilter = null,
  sourceNameFilter = null,
  itemLimit,
}: {
  compact?: boolean;
  /** When set, asks API for trends tagged with this platform (e.g. GOOGLE). */
  platformFilter?: string | null;
  /** Filter by article `sourceName` (Google Ads, Meta Business, …). */
  sourceNameFilter?: string | null;
  /** Override default fetch count (compact default 4, full default 12). */
  itemLimit?: number;
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const limit = itemLimit ?? (compact ? 4 : 12);
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (platformFilter) params.set("platform", platformFilter);
    if (sourceNameFilter) params.set("sourceName", sourceNameFilter);

    fetch(`/api/market-trends?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load trends");
        return r.json();
      })
      .then((j: ApiResponse) => {
        if (!cancelled) setData(j);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load market trends.");
      });
    return () => {
      cancelled = true;
    };
  }, [compact, platformFilter, sourceNameFilter, itemLimit]);

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="ha-skeleton h-5 w-40" />
        <div className="mt-4 space-y-3">
          <div className="ha-skeleton h-16 w-full rounded-xl" />
          <div className="ha-skeleton h-16 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const items = data.items;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Market pulse</h2>
            <p className="mt-0.5 text-xs text-neutral-600">
              What&apos;s moving across platforms — use it to brief creatives and budgets.
              {data.source === "demo" && (
                <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-600">
                  {data.degraded ? "Offline demo" : "Demo data"}
                </span>
              )}
            </p>
          </div>
        </div>
        {compact && (
          <Link
            href="/market-pulse"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all
          </Link>
        )}
      </div>

      <ul className={`mt-4 space-y-3 ${compact ? "" : "max-h-[min(70vh,520px)] overflow-y-auto pr-1"}`}>
        {items.map((t) => (
          <li
            key={t.id}
            className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3 transition-colors hover:bg-neutral-50"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-neutral-900">{t.title}</h3>
              <span className="text-[11px] font-medium uppercase text-neutral-600">{t.sourceName}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">{t.summary}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {t.platforms?.slice(0, 4).map((p) => (
                <span
                  key={p}
                  className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold uppercase text-neutral-600 ring-1 ring-neutral-200"
                >
                  {p}
                </span>
              ))}
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Source
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
