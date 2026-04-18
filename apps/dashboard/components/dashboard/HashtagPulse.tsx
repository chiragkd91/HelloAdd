"use client";

import Link from "next/link";
import { Hash } from "lucide-react";
import { useEffect, useState } from "react";

export type HashtagTrendItem = {
  id: string;
  tag: string;
  platforms: string[];
  heatScore: number;
  momentum: string;
  context: string;
  category: string;
  /** Same lineage as Market pulse article `sourceName` */
  sourceName: string;
  updatedAt: string;
};

type ApiResponse = {
  items: HashtagTrendItem[];
  source?: string;
  degraded?: boolean;
};

function heatStyles(heat: number) {
  if (heat >= 88) return "bg-primary/15 text-primary ring-primary/25";
  if (heat >= 80) return "bg-amber-50 text-amber-900 ring-amber-200/80";
  return "bg-neutral-100 text-neutral-700 ring-neutral-200";
}

export function HashtagPulse({
  compact = false,
  platformFilter = null,
  sourceNameFilter = null,
}: {
  compact?: boolean;
  /** e.g. INSTAGRAM — narrows list when tags are tagged with platforms */
  platformFilter?: string | null;
  /** Filter by Market pulse–style source (Google Ads, Meta Business, …) */
  sourceNameFilter?: string | null;
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const limit = compact ? 8 : 24;
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (platformFilter) params.set("platform", platformFilter);
    if (sourceNameFilter) params.set("sourceName", sourceNameFilter);

    fetch(`/api/hashtag-trends?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((j: ApiResponse) => {
        if (!cancelled) setData(j);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load hashtag trends.");
      });
    return () => {
      cancelled = true;
    };
  }, [compact, platformFilter, sourceNameFilter]);

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900">{error}</div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="ha-skeleton h-5 w-48" />
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="ha-skeleton h-9 w-28 rounded-full" />
          <div className="ha-skeleton h-9 w-32 rounded-full" />
          <div className="ha-skeleton h-9 w-24 rounded-full" />
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
            <Hash className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Trending hashtags</h2>
            <p className="mt-0.5 text-xs text-neutral-600">
              Tags grouped by <span className="font-semibold text-neutral-700">market source</span> (same labels as
              article trends). Align copy with each publisher narrative.
              {data.source === "demo" && (
                <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-600">
                  {data.degraded ? "Offline demo" : "Demo data"}
                </span>
              )}
            </p>
          </div>
        </div>
        {compact && (
          <Link href="/market-pulse" className="text-xs font-semibold text-primary hover:underline">
            Trends hub
          </Link>
        )}
      </div>

      <ul className={`mt-4 space-y-2 ${compact ? "" : "max-h-[min(60vh,420px)] overflow-y-auto pr-1"}`}>
        {items.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-start gap-2 rounded-xl border border-neutral-100 bg-neutral-50/50 px-3 py-2.5"
          >
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${heatStyles(t.heatScore)}`}
            >
              #{t.tag.replace(/^#/, "")}
            </span>
            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-primary ring-1 ring-primary/20">
              {t.sourceName}
            </span>
            <span className="text-[10px] font-bold uppercase text-neutral-600">{t.momentum}</span>
            <span className="text-[10px] tabular-nums text-neutral-600">· {t.heatScore} heat</span>
            {t.category ? (
              <span className="text-[10px] font-medium text-neutral-600">{t.category}</span>
            ) : null}
            <p className="w-full text-xs leading-relaxed text-neutral-600">{t.context}</p>
            <div className="flex flex-wrap gap-1">
              {t.platforms?.slice(0, 5).map((p) => (
                <span
                  key={p}
                  className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase text-neutral-600 ring-1 ring-neutral-200"
                >
                  {p}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
