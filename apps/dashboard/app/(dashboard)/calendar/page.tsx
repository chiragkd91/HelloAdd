"use client";

import { platformHex } from "@/lib/platformColors";
import { platformLabel } from "@/lib/campaignDisplay";
import { localCalendarDayKey } from "@/lib/calendarLocalDate";
import type { ApiCampaign } from "@/types/campaign";
import { useCampaigns } from "@/hooks/useCampaigns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function useMonthState() {
  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  /** Deterministic label — avoid `toLocaleString` (Node vs browser locale mismatch → hydration errors). */
  const label = `${MONTH_NAMES_LONG[month]} ${year}`;

  function prev() {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function next() {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPad = new Date(year, month, 1).getDay();

  const cells = useMemo(() => {
    const out: ({ day: number } | null)[] = [];
    for (let i = 0; i < startPad; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push({ day: d });
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [daysInMonth, startPad]);

  return { year, month, label, prev, next, cells };
}

function campaignsActiveOnDay(campaigns: ApiCampaign[], year: number, month: number, day: number): ApiCampaign[] {
  const dayStart = new Date(year, month, day, 0, 0, 0, 0);
  const dayEnd = new Date(year, month, day, 23, 59, 59, 999);
  return campaigns.filter((c) => {
    const start = new Date(c.startDate);
    const end = c.endDate ? new Date(c.endDate) : new Date(2099, 11, 31, 23, 59, 59, 999);
    return start <= dayEnd && end >= dayStart;
  });
}

function budgetRisk(c: ApiCampaign): boolean {
  return c.budgetTotal > 0 && c.budgetSpent / c.budgetTotal >= 0.95;
}

type CalendarPostChip = {
  postId: string;
  content: string;
  platform: string;
  status: string;
  scheduledAt: string;
};

export default function CalendarPage() {
  const { year, month, label, prev, next, cells } = useMonthState();
  const { campaigns, isLoading, error } = useCampaigns({ limit: 500 });
  const [postDays, setPostDays] = useState<Record<string, CalendarPostChip[]>>({});
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  /** Browser IANA zone — set after mount so scheduled posts match local calendar days. */
  const [viewerTimeZone, setViewerTimeZone] = useState<string | null>(null);

  useEffect(() => {
    setViewerTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  useEffect(() => {
    if (viewerTimeZone === null) return;
    const timeZone = viewerTimeZone;

    async function loadCalendarPosts() {
      setPostsLoading(true);
      setPostsError(null);
      try {
        const rangeStart = new Date(year, month, 1, 0, 0, 0, 0);
        const rangeEnd = new Date(year, month + 1, 1, 0, 0, 0, 0);
        const params = new URLSearchParams({
          month: String(month + 1),
          year: String(year),
          from: rangeStart.toISOString(),
          to: rangeEnd.toISOString(),
          timeZone,
        });
        const res = await fetch(`/api/posts/calendar?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as {
          days?: Record<string, CalendarPostChip[]>;
          error?: string;
        };
        if (!res.ok) {
          const msg =
            typeof body.error === "string" && body.error.trim()
              ? body.error
              : `Could not load scheduled posts (${res.status}).`;
          setPostDays({});
          setPostsError(msg);
          toast.error(msg);
          return;
        }
        setPostDays(body.days ?? {});
      } catch {
        const msg = "Network error while loading scheduled posts.";
        setPostDays({});
        setPostsError(msg);
        toast.error(msg);
      } finally {
        setPostsLoading(false);
      }
    }
    void loadCalendarPosts();
  }, [month, year, viewerTimeZone]);

  const chipsByDay = useMemo(() => {
    const map = new Map<number, ApiCampaign[]>();
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
      const active = campaignsActiveOnDay(campaigns, year, month, d);
      if (active.length) map.set(d, active);
    }
    return map;
  }, [campaigns, year, month]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Calendar</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Campaigns active on each day (from start/end dates). Red outline: spend ≥ 95% of budget. Scheduled posts use
            your device timezone so they line up with each calendar cell.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
          >
            ← Prev
          </button>
          <span className="min-w-[10rem] text-center text-sm font-bold text-neutral-900">{label}</span>
          <button
            type="button"
            onClick={next}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
          >
            Next →
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {postsError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {postsError}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="-mx-1 overflow-x-auto overscroll-x-contain pb-1 sm:mx-0 sm:overflow-visible">
          <div className="min-w-[300px] px-1 sm:min-w-0">
            <div className="grid grid-cols-7 gap-1 border-b border-neutral-100 pb-2 text-center text-[11px] font-bold uppercase text-neutral-600">
              {WEEKDAYS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {cells.map((cell, idx) => {
                if (!cell)
                  return <div key={`empty-${idx}`} className="min-h-[96px] rounded-xl bg-neutral-50/50" />;
                const { day } = cell;
                const dayCampaigns = chipsByDay.get(day) ?? [];
                const dayKey = localCalendarDayKey(year, month, day);
                const dayPosts = postDays[dayKey] ?? [];
                const warn = dayCampaigns.some(budgetRisk);
                const hasBoth = dayCampaigns.length > 0 && dayPosts.length > 0;
                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex min-h-[96px] flex-col gap-1 rounded-xl border p-2 ${
                      warn ? "border-2 border-red-500 bg-red-50/30" : "border-neutral-100 bg-neutral-50/30"
                    } cursor-pointer`}
                  >
                    <span className="text-xs font-bold text-neutral-700">{day}</span>
                    <div className="flex flex-col gap-1">
                      {isLoading ? (
                        <span className="text-[11px] text-neutral-600">…</span>
                      ) : (
                        dayCampaigns.slice(0, 3).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay(day);
                            }}
                            className="truncate rounded px-1.5 py-0.5 text-left text-[11px] font-bold text-white shadow-sm"
                            style={{
                              backgroundColor: platformHex(c.platform),
                            }}
                          >
                            {c.name}
                          </button>
                        ))
                      )}
                      {postsLoading ? (
                        <span className="text-[11px] text-neutral-600">…</span>
                      ) : (
                        dayPosts.slice(0, 2).map((p) => (
                          <span
                            key={`${p.postId}-${p.platform}`}
                            className="truncate rounded px-1.5 py-0.5 text-left text-[11px] font-semibold text-amber-900 shadow-sm"
                            style={{ backgroundColor: "#FDE68A" }}
                          >
                            {p.platform} post
                          </span>
                        ))
                      )}
                      {!isLoading && dayCampaigns.length > 3 && (
                        <span className="text-[11px] text-neutral-600">+{dayCampaigns.length - 3} more</span>
                      )}
                      {!postsLoading && dayPosts.length > 2 && (
                        <span className="text-[11px] text-neutral-600">+{dayPosts.length - 2} post(s)</span>
                      )}
                      {hasBoth && <span className="text-[11px] font-bold text-emerald-700">Coordinated</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedDay != null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
          onClick={() => setSelectedDay(null)}
          onKeyDown={(e) => e.key === "Escape" && setSelectedDay(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <p className="text-xs font-semibold text-neutral-600">
              {new Date(year, month, selectedDay).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mt-1 text-lg font-bold text-neutral-900">
              Day plan: {(chipsByDay.get(selectedDay) ?? []).length} ad(s),{" "}
              {(postDays[localCalendarDayKey(year, month, selectedDay)] ?? []).length} post(s)
            </p>
            <div className="mt-3 space-y-2">
              <p className="text-xs font-bold uppercase text-neutral-600">Campaigns</p>
              {(chipsByDay.get(selectedDay) ?? []).length === 0 && (
                <p className="text-xs text-neutral-600">No campaigns running this day.</p>
              )}
              {(chipsByDay.get(selectedDay) ?? []).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-neutral-100 px-2 py-1">
                  <span className="text-sm text-neutral-800">{c.name}</span>
                  <Link href={`/campaigns/${c.id}`} className="text-xs font-semibold text-primary hover:underline">
                    Open
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <p className="text-xs font-bold uppercase text-neutral-600">Scheduled posts</p>
              {(postDays[localCalendarDayKey(year, month, selectedDay)] ?? []).length === 0 && (
                <p className="text-xs text-neutral-600">No scheduled posts for this day.</p>
              )}
              {(postDays[localCalendarDayKey(year, month, selectedDay)] ?? []).map((p) => (
                <div
                  key={`${p.postId}-${p.platform}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-neutral-100 px-2 py-1"
                >
                  <span className="min-w-0 text-sm text-neutral-800">
                    {platformLabel(p.platform)} ·{" "}
                    {new Date(p.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    <span className="ml-1.5 text-[11px] text-neutral-600">{p.status}</span>
                  </span>
                  <Link
                    href={`/scheduler/${p.postId}`}
                    className="shrink-0 text-xs font-semibold text-primary hover:underline"
                  >
                    Open
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              {(chipsByDay.get(selectedDay) ?? []).length > 0 &&
              (postDays[localCalendarDayKey(year, month, selectedDay)] ?? []).length > 0
                ? "This day has both paid and organic activity — well coordinated."
                : "Opportunity: add both paid + organic activity for stronger coordinated reach."}
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/scheduler/create?date=${localCalendarDayKey(year, month, selectedDay)}`}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
              >
                Add post for this day
              </Link>
              <button
                type="button"
                className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold"
                onClick={() => setSelectedDay(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase text-neutral-600">Legend</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {(["FACEBOOK", "INSTAGRAM", "GOOGLE", "LINKEDIN", "YOUTUBE"] as const).map((p) => (
            <span key={p} className="flex items-center gap-2 text-sm text-neutral-700">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: platformHex(p) }} />
              {platformLabel(p)}
            </span>
          ))}
          <span className="flex items-center gap-2 text-sm text-neutral-700">
            <span className="h-3 w-3 rounded-sm bg-amber-300" />
            Scheduled post
          </span>
          <span className="flex items-center gap-2 text-sm text-neutral-700">
            <span className="h-3 w-3 rounded-sm bg-emerald-500" />
            Coordinated day
          </span>
        </div>
      </div>
    </div>
  );
}
