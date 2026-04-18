"use client";

import { formatShortDate } from "@/lib/campaignDisplay";
import { platformHex } from "@/lib/platformColors";
import Link from "next/link";
import { useMemo } from "react";

const MS_DAY = 86_400_000;
/** Open-ended campaigns: bar length preview from start (matches main calendar month scale). */
const OPEN_ENDED_PREVIEW_DAYS = 366;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function parseIso(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type CampaignCalendarProps = {
  startDate: string;
  endDate: string | null;
  platform: string;
};

/**
 * Compact campaign run window vs “today”: progress bar, dates, and link to the org calendar.
 */
export function CampaignCalendar({ startDate, endDate, platform }: CampaignCalendarProps) {
  const color = platformHex(platform);

  const timeline = useMemo(() => {
    const start = parseIso(startDate);
    if (!start) return { kind: "invalid" as const };

    const endParsed = endDate ? parseIso(endDate) : null;
    const hasFixedEnd =
      endParsed !== null && endParsed.getTime() >= start.getTime();

    const barEnd = hasFixedEnd
      ? endParsed
      : new Date(start.getTime() + OPEN_ENDED_PREVIEW_DAYS * MS_DAY);

    const totalMs = Math.max(1, barEnd.getTime() - start.getTime());
    const now = Date.now();
    const elapsedMs = clamp(now - start.getTime(), 0, totalMs);
    const fillPct = (elapsedMs / totalMs) * 100;

    let phase: "upcoming" | "active" | "ended";
    if (now < start.getTime()) {
      phase = "upcoming";
    } else if (hasFixedEnd && now > endParsed!.getTime()) {
      phase = "ended";
    } else {
      phase = "active";
    }

    const daysTotal = Math.ceil(totalMs / MS_DAY);
    let daysRemaining: number | null = null;
    if (hasFixedEnd && phase === "active") {
      daysRemaining = Math.max(0, Math.ceil((endParsed!.getTime() - now) / MS_DAY));
    }

    return {
      kind: "ok" as const,
      start,
      barEnd,
      hasFixedEnd,
      realEnd: hasFixedEnd ? endParsed! : null,
      openEnded: !hasFixedEnd,
      totalMs,
      fillPct,
      phase,
      daysTotal,
      daysRemaining,
    };
  }, [startDate, endDate]);

  if (timeline.kind === "invalid") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Invalid campaign start date.
      </div>
    );
  }

  const { start, hasFixedEnd, realEnd, openEnded, fillPct, phase, daysTotal, daysRemaining } = timeline;

  const phaseLabel =
    phase === "upcoming"
      ? "Not started yet"
      : phase === "ended"
        ? "Campaign window ended"
        : openEnded
          ? "Active (no fixed end)"
          : "Active";

  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">Run window</p>
          <p className="mt-1 text-sm text-neutral-800">
            <span className="font-semibold text-neutral-900">{formatShortDate(start.toISOString())}</span>
            <span className="mx-1.5 text-neutral-600">→</span>
            <span className="font-semibold text-neutral-900">
              {hasFixedEnd && realEnd ? formatShortDate(realEnd.toISOString()) : "Open-ended"}
            </span>
          </p>
        </div>
        <Link
          href="/calendar"
          className="shrink-0 text-xs font-semibold text-primary hover:underline"
        >
          Full calendar
        </Link>
      </div>

      <div className="mt-3">
        <div className="relative h-3 overflow-hidden rounded-full bg-neutral-200/90">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${clamp(fillPct, 0, 100)}%`,
              backgroundColor: color,
              opacity: 0.9,
            }}
            title={`${phaseLabel} · ${daysTotal} day window${openEnded ? " (preview)" : ""}`}
          />
          {phase === "active" && (
            <span
              className="pointer-events-none absolute top-1/2 h-4 w-0.5 rounded-full bg-neutral-900 shadow-sm"
              style={{
                left: `${clamp(fillPct, 0, 100)}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-600">
          <span>{phaseLabel}</span>
          <span>
            {daysTotal} day{daysTotal === 1 ? "" : "s"} in view
            {openEnded && " · first year preview for open-ended"}
            {daysRemaining !== null && phase === "active" && ` · ~${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`}
          </span>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-neutral-600">
        Bar shows elapsed time from start to today within{" "}
        {hasFixedEnd ? "the scheduled end date" : `the first ${OPEN_ENDED_PREVIEW_DAYS} days`}. Match paid runs with
        organic posts on the{" "}
        <Link href="/calendar" className="font-medium text-primary hover:underline">
          calendar
        </Link>
        .
      </p>
    </div>
  );
}
