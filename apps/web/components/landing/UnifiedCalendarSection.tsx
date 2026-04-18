"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion";

type Entry = { type: "paid" | "organic"; label: string; time: string };

/**
 * Marketing calendar mock: full month grid, dots per day, detail panel for the selected date.
 * — Today: DEMO_TODAY gets subtle border/bg; selected day adds ring + bg (selected wins if same day).
 * — Motion: staggered cells; list re-animates on `key={selectedDay}`; `useReducedMotion` disables stagger/scale/count-up.
 * — To use another month: set CAL_YEAR, CAL_MONTH_INDEX (0–11), DEMO_TODAY, and EVENTS_BY_DAY keys to valid day numbers
 *   for that month (e.g. February ≠ day 30).
 */
const CAL_YEAR = 2026;
const CAL_MONTH_INDEX = 3; // April (0-based)

/** What shows on the calendar: paid + organic touchpoints per date */
const EVENTS_BY_DAY: Record<number, Entry[]> = {
  3: [{ type: "organic", label: "Instagram Story — teaser", time: "11:00" }],
  7: [{ type: "paid", label: "Meta Ads — retargeting", time: "09:30" }],
  12: [
    { type: "paid", label: "YouTube pre-roll — launch", time: "08:00" },
    { type: "organic", label: "LinkedIn carousel", time: "15:00" },
  ],
  18: [
    { type: "paid", label: "Meta Ads - Diwali Prospecting", time: "10:00" },
    { type: "organic", label: "Instagram Reel - Offer Teaser", time: "12:30" },
    { type: "paid", label: "Google Search - Brand Campaign", time: "16:00" },
    { type: "organic", label: "LinkedIn Post - Case Study", time: "18:15" },
  ],
  24: [{ type: "organic", label: "WhatsApp broadcast — offer", time: "19:00" }],
  28: [{ type: "paid", label: "Google Display — remarketing", time: "14:00" }],
};

const MONTH_NAME = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
  new Date(CAL_YEAR, CAL_MONTH_INDEX, 1),
);

const TOTAL_MONTH = Object.values(EVENTS_BY_DAY).reduce((acc, list) => acc + list.length, 0);

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** “Today” chip in the mock (aligns with product marketing timeline) */
const DEMO_TODAY = 18;

function getMonthCells(year: number, monthIndex: number): ({ kind: "empty" } | { kind: "day"; day: number })[] {
  const first = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;
  const cells: ({ kind: "empty" } | { kind: "day"; day: number })[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ kind: "empty" });
  for (let d = 1; d <= lastDay; d++) cells.push({ kind: "day", day: d });
  while (cells.length % 7 !== 0) cells.push({ kind: "empty" });
  return cells;
}

function weekdayLabel(day: number): string {
  const d = new Date(CAL_YEAR, CAL_MONTH_INDEX, day);
  return new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(d);
}

function TotalMonthBadge({ reduced, total }: { reduced: boolean; total: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const [n, setN] = useState(reduced ? total : 0);

  useEffect(() => {
    if (reduced) setN(total);
  }, [reduced, total]);

  useEffect(() => {
    if (reduced) return;
    if (!inView) return;
    const ctrl = animate(0, total, {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setN(Math.round(latest)),
    });
    return () => ctrl.stop();
  }, [inView, reduced, total]);

  return (
    <span
      ref={ref}
      className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-900 shadow-sm ring-1 ring-neutral-200/90"
    >
      Month total:{" "}
      <span className="tabular-nums text-primary" aria-live="polite">
        {n}
      </span>{" "}
      <span className="font-medium text-neutral-600">scheduled</span>
    </span>
  );
}

export function UnifiedCalendarSection() {
  const reduced = useReducedMotion();
  const monthCells = useMemo(() => getMonthCells(CAL_YEAR, CAL_MONTH_INDEX), []);
  const [selectedDay, setSelectedDay] = useState(DEMO_TODAY);

  const selectedEntries = EVENTS_BY_DAY[selectedDay] ?? [];
  const paidOnDay = selectedEntries.filter((i) => i.type === "paid").length;
  const organicOnDay = selectedEntries.filter((i) => i.type === "organic").length;

  const listVariants: Variants = useMemo(
    () => ({
      hidden: { opacity: reduced ? 1 : 0 },
      show: {
        opacity: 1,
        transition: reduced
          ? { duration: 0 }
          : { staggerChildren: 0.09, delayChildren: 0.06 },
      },
    }),
    [reduced],
  );

  const rowVariants: Variants = useMemo(
    () => ({
      hidden: {
        opacity: reduced ? 1 : 0,
        x: reduced ? 0 : -10,
      },
      show: {
        opacity: 1,
        x: 0,
        transition: { duration: reduced ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [reduced],
  );

  const cellVariants: Variants = useMemo(
    () => ({
      hidden: { opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.92 },
      show: {
        opacity: 1,
        scale: 1,
        transition: { duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [reduced],
  );

  return (
    <section className="border-t border-sand bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 0.35 }}
          className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500"
        >
          The calendar
        </motion.p>
        <motion.h2
          initial={reduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.05 }}
          className="mt-3 text-center text-2xl font-bold tracking-tight text-dark md:text-3xl"
        >
          Paid + organic, on one page.
        </motion.h2>
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : 0.1 }}
          className="mx-auto mt-4 max-w-2xl text-center text-sm text-neutral-600 md:text-base"
        >
          Full month view: see every date, spot clashes, and open a day to see paid ads next to organic posts — same as
          your real workspace.
        </motion.p>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 18, scale: reduced ? 1 : 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-12 max-w-4xl rounded-2xl border border-sand bg-fog p-4 shadow-sm sm:p-5"
        >
          <div className="mb-4 flex flex-col gap-3 border-b border-neutral-200/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold text-neutral-900">{MONTH_NAME}</p>
                <span className="rounded-full bg-neutral-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                  Month view
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TotalMonthBadge reduced={!!reduced} total={TOTAL_MONTH} />
                <span className="text-xs text-neutral-500">Tap a date with dots to preview that day</span>
              </div>
            </div>
            <span className="shrink-0 self-start rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Interactive preview
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start">
            {/* Full month grid */}
            <div className="min-w-0 rounded-xl border border-neutral-200/90 bg-white p-2 shadow-sm sm:p-3">
              <div className="grid grid-cols-7 gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 sm:text-xs">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="px-0.5 py-1 text-center">
                    {w}
                  </div>
                ))}
              </div>
              <motion.div
                className="mt-1 grid grid-cols-7 gap-1"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-6% 0px" }}
                variants={{
                  hidden: {},
                  show: {
                    transition: reduced
                      ? { duration: 0 }
                      : { staggerChildren: 0.025, delayChildren: 0.04 },
                  },
                }}
              >
                {monthCells.map((cell, idx) => {
                  if (cell.kind === "empty") {
                    return <div key={`e-${idx}`} className="min-h-[2.75rem] sm:min-h-[3.25rem]" aria-hidden />;
                  }
                  const { day } = cell;
                  const events = EVENTS_BY_DAY[day];
                  const paidN = events?.filter((e) => e.type === "paid").length ?? 0;
                  const orgN = events?.filter((e) => e.type === "organic").length ?? 0;
                  const hasEvents = paidN + orgN > 0;
                  const isToday = day === DEMO_TODAY;
                  const isSelected = selectedDay === day;

                  return (
                    <motion.button
                      key={day}
                      type="button"
                      variants={cellVariants}
                      onClick={() => setSelectedDay(day)}
                      className={`relative flex min-h-[2.75rem] flex-col items-center rounded-lg border px-0.5 pb-1 pt-1 text-center transition-colors sm:min-h-[3.25rem] sm:px-1 ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : isToday
                            ? "border-primary/40 bg-primary/[0.06]"
                            : "border-transparent bg-neutral-50/80 hover:bg-neutral-100"
                      } ${hasEvents ? "cursor-pointer" : "cursor-default hover:bg-neutral-50/80"}`}
                      aria-pressed={isSelected}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`${MONTH_NAME.split(" ")[0]} ${day}, ${hasEvents ? `${paidN + orgN} scheduled` : "no items"}`}
                    >
                      <span
                        className={`text-[11px] font-semibold tabular-nums sm:text-xs ${
                          isSelected ? "text-primary" : isToday ? "text-primary" : "text-neutral-800"
                        }`}
                      >
                        {day}
                      </span>
                      {hasEvents ? (
                        <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                          {Array.from({ length: Math.min(paidN, 3) }).map((_, i) => (
                            <span key={`p-${i}`} className="h-1 w-1 rounded-full bg-focus-blue sm:h-1.5 sm:w-1.5" />
                          ))}
                          {Array.from({ length: Math.min(orgN, 3) }).map((_, i) => (
                            <span key={`o-${i}`} className="h-1 w-1 rounded-full bg-primary sm:h-1.5 sm:w-1.5" />
                          ))}
                          {paidN + orgN > 6 ? (
                            <span className="text-[8px] font-bold text-neutral-400">+</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="mt-1 block h-2 sm:h-2.5" aria-hidden />
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
              <p className="mt-2 text-[10px] text-neutral-500 sm:text-xs">
                Blue dots = paid · Purple = organic · Bold ring = demo “today”
              </p>
            </div>

            {/* Selected day — what you do on the calendar */}
            <div className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Selected day</p>
              <p className="mt-1 text-sm font-bold text-neutral-900">
                {weekdayLabel(selectedDay)}, {MONTH_NAME.split(" ")[0]} {selectedDay}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                {selectedEntries.length > 0 ? (
                  <>
                    <span>
                      {selectedEntries.length} scheduled · {paidOnDay} paid · {organicOnDay} organic
                    </span>
                  </>
                ) : (
                  <span>No ads or posts scheduled — pick another date with dots.</span>
                )}
              </div>

              {selectedEntries.length > 0 ? (
                <motion.div
                  key={selectedDay}
                  className="mt-4 space-y-2"
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                >
                  {selectedEntries.map((item) => (
                    <motion.div
                      key={`${item.time}-${item.label}`}
                      variants={rowVariants}
                      className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-fog px-3 py-2 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            item.type === "paid" ? "bg-focus-blue" : "bg-primary"
                          }`}
                        />
                        <span className="truncate text-sm text-neutral-800">{item.label}</span>
                      </div>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-neutral-500">{item.time}</span>
                    </motion.div>
                  ))}
                </motion.div>
              ) : null}

              <p className="mt-4 text-xs leading-relaxed text-neutral-500">
                Blue = paid ads · Purple = organic (brand colours)
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
