"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/Card";

const NAV_LABELS = ["Overview", "Campaigns", "Analytics", "Budget", "Reports"] as const;

/** Extra copy shown on hover — demo only */
const NAV_HOVER_DETAILS: {
  headline: string;
  body: string;
  tips: string[];
}[] = [
  {
    headline: "Command center",
    body: "One-screen snapshot of spend, impressions, and account health across every connected ad account.",
    tips: ["Live KPI grid", "Region & platform split", "AI health score"],
  },
  {
    headline: "Campaigns",
    body: "Search, filter, and drill into Meta, Google, LinkedIn & YouTube campaigns from a single table.",
    tips: ["Status & budget pacing", "Error flags (dead ads, overspend)", "Bulk actions"],
  },
  {
    headline: "Analytics",
    body: "Trend lines for CTR, CPA, and conversions with cohort-friendly date ranges and export-ready views.",
    tips: ["Spend vs CTR charts", "Funnel-friendly metrics", "PDF / Excel export"],
  },
  {
    headline: "Budget",
    body: "Set caps and pacing rules; get alerted before finance does when a line item goes off-rail.",
    tips: ["Daily & lifetime caps", "WhatsApp + email alerts", "AI overspend detection"],
  },
  {
    headline: "Reports",
    body: "Schedule weekly or monthly packs for leadership — white-label for agencies with your logo.",
    tips: ["Branded PDF & Excel", "Email delivery", "Client portal links"],
  },
];

type SlideData = {
  path: string;
  navActive: number;
  metrics: { label: string; value: string; sub: string }[];
  chart: { title: string; sub: string; total: string; bars: number[] };
};

const SLIDES: SlideData[] = [
  {
    path: "helloadd.online / acme-brand",
    navActive: 2,
    metrics: [
      { label: "Spend (7d)", value: "₹12.4L", sub: "+8% vs last week" },
      { label: "Avg CTR", value: "2.84%", sub: "Across platforms" },
      { label: "Leads", value: "1,240", sub: "Meta + Google" },
    ],
    chart: {
      title: "Spend by day",
      sub: "Last 7 days · INR",
      total: "₹8.2L total",
      bars: [38, 55, 44, 72, 50, 62, 48],
    },
  },
  {
    path: "helloadd.online / festive-sale",
    navActive: 1,
    metrics: [
      { label: "ROAS", value: "4.2x", sub: "Blended MER" },
      { label: "Conv. rate", value: "3.1%", sub: "Store + lead" },
      { label: "Reach", value: "28.4L", sub: "Meta + YouTube" },
    ],
    chart: {
      title: "Conversions by day",
      sub: "Campaign: Diwali push",
      total: "3,180 conv.",
      bars: [52, 48, 61, 55, 70, 45, 58],
    },
  },
  {
    path: "helloadd.online / agencies",
    navActive: 4,
    metrics: [
      { label: "Active clients", value: "12", sub: "White-label" },
      { label: "Spend under mgmt", value: "₹2.1Cr", sub: "This month" },
      { label: "Alerts fired", value: "38", sub: "AI guardrails" },
    ],
    chart: {
      title: "Client spend mix",
      sub: "By vertical",
      total: "₹41L this week",
      bars: [45, 62, 38, 55, 48, 66, 52],
    },
  },
];

const CHART_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const AUTO_MS = 5000;

const slideVariantsMotion = {
  enter: (dir: number) => ({
    y: dir >= 0 ? 28 : -28,
    opacity: 0,
  }),
  center: { y: 0, opacity: 1 },
  exit: (dir: number) => ({
    y: dir >= 0 ? -20 : 20,
    opacity: 0,
  }),
};

const slideVariantsReduced = {
  enter: { y: 0, opacity: 1 },
  center: { y: 0, opacity: 1 },
  exit: { y: 0, opacity: 1 },
};

export function DashboardMockup() {
  const [[page, direction], setPage] = useState([0, 0]);
  const [minimized, setMinimized] = useState(false);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const slideVariants = useMemo(
    () => (prefersReducedMotion ? slideVariantsReduced : slideVariantsMotion),
    [prefersReducedMotion]
  );

  const slideIndex = ((page % SLIDES.length) + SLIDES.length) % SLIDES.length;
  const data = SLIDES[slideIndex];

  const goTo = useCallback((index: number) => {
    setPage(([current]) => {
      const len = SLIDES.length;
      const next = ((index % len) + len) % len;
      const dir = next === current ? 0 : next > current ? 1 : -1;
      return [next, dir];
    });
  }, []);

  const nextSlide = useCallback(() => {
    setPage(([p]) => {
      const len = SLIDES.length;
      return [(p + 1) % len, 1];
    });
  }, []);

  useEffect(() => {
    if (minimized || paused || prefersReducedMotion) return;
    const t = window.setInterval(nextSlide, AUTO_MS);
    return () => window.clearInterval(t);
  }, [minimized, paused, prefersReducedMotion, nextSlide, slideIndex]);

  const toggleMinimize = useCallback(() => {
    setMinimized((m) => !m);
  }, []);

  const trafficDot = "h-2.5 w-2.5 rounded-full transition-all duration-300 sm:h-3 sm:w-3 opacity-90 hover:opacity-100";

  return (
    <div
      className="relative overflow-visible rounded-2xl border border-neutral-700 bg-neutral-950 shadow-2xl shadow-black/40"
      aria-hidden
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Window chrome — traffic lights: red = expand when minimized, amber = minimize, purple = next slide */}
      <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => minimized && setMinimized(false)}
            className="rounded-full p-0.5 transition-transform hover:scale-110 active:scale-95"
            title={minimized ? "Expand" : "Restore (when minimized)"}
            aria-label={minimized ? "Expand dashboard" : "Window control (demo)"}
          >
            <span className={`block ${trafficDot} bg-red-500/90 ${minimized ? "ring-2 ring-white/30" : ""}`} />
          </button>
          <button
            type="button"
            onClick={toggleMinimize}
            className="rounded-full p-0.5 transition-transform hover:scale-110 active:scale-95"
            title={minimized ? "Expand" : "Minimize"}
            aria-label={minimized ? "Expand" : "Minimize preview"}
          >
            <span
              className={`block ${trafficDot} bg-amber-500/90 ${minimized ? "ring-2 ring-amber-300/60" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              if (minimized) setMinimized(false);
              else nextSlide();
            }}
            className="rounded-full p-0.5 transition-transform hover:scale-110 active:scale-95"
            title={minimized ? "Expand" : "Next view"}
            aria-label={minimized ? "Expand dashboard" : "Next dashboard view"}
          >
            <span className={`block ${trafficDot} bg-primary/95`} />
          </button>
        </div>
        <div className="ml-1.5 min-w-0 flex-1 truncate rounded-md bg-neutral-800/90 px-2 py-1 text-[9px] font-medium text-neutral-400 sm:text-[10px]">
          {data.path}
        </div>
        <span className="hidden text-[8px] text-neutral-600 sm:inline">
          {minimized
            ? "Minimized"
            : paused
              ? "Paused"
              : prefersReducedMotion
                ? "Manual"
                : `Auto · ${AUTO_MS / 1000}s`}
        </span>
      </div>

      <motion.div
        initial={false}
        animate={minimized ? "collapsed" : "open"}
        variants={{
          open: { height: "auto", opacity: 1 },
          collapsed: { height: 0, opacity: 0 },
        }}
        transition={
          prefersReducedMotion
            ? { duration: 0.2 }
            : { type: "spring", stiffness: 320, damping: 32 }
        }
        className={minimized ? "overflow-hidden" : "overflow-visible"}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 34, mass: 0.6 }
            }
            className="flex flex-col gap-3 p-2.5 sm:p-3 md:flex-row md:gap-3"
          >
            <SlideContent data={data} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Slide indicators (synced with 3 views) */}
      <div className="flex justify-center gap-1.5 border-t border-neutral-800/80 py-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              slideIndex === i ? "w-6 bg-primary" : "w-1.5 bg-neutral-600 hover:bg-neutral-500"
            }`}
            aria-label={`View ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function NavHoverPanel({
  detail,
  label,
  className = "",
}: {
  detail: (typeof NAV_HOVER_DETAILS)[number];
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-neutral-600 bg-neutral-900/98 p-2.5 text-left shadow-2xl ring-1 ring-black/50 backdrop-blur-sm ${className}`}
    >
      <p className="text-[9px] font-bold uppercase tracking-wide text-primary">{detail.headline}</p>
      <p className="mt-1.5 text-[8px] leading-relaxed text-neutral-300 sm:text-[9px]">{detail.body}</p>
      <ul className="mt-2 space-y-1 border-t border-neutral-700/90 pt-2">
        {detail.tips.map((t) => (
          <li key={t} className="flex gap-2 text-[8px] leading-snug text-neutral-400 sm:text-[9px]">
            <span className="shrink-0 font-bold text-primary" aria-hidden>
              ·
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 border-t border-neutral-800 pt-2 text-[7px] text-neutral-600">{label} · Hello Add</p>
    </div>
  );
}

function SlideContent({ data }: { data: SlideData }) {
  return (
    <>
      <aside className="relative z-20 flex w-full shrink-0 flex-col gap-1.5 overflow-visible md:w-[32%]">
        <div className="rounded-lg bg-neutral-800/90 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-500 sm:text-[10px]">
          Workspace
        </div>
        {NAV_LABELS.map((label, i) => {
          const active = i === data.navActive;
          const detail = NAV_HOVER_DETAILS[i];
          return (
            <div
              key={label}
              className="group relative z-10"
              title={`${label} — ${detail.headline}`}
            >
              <Card
                variant="sidebarRow"
                className={`relative flex min-h-[1.75rem] cursor-default items-center px-2 py-1 transition-[box-shadow] sm:min-h-8 sm:px-2.5 ${
                  active ? "ring-1 ring-primary/40" : ""
                } group-hover:z-30 group-hover:ring-1 group-hover:ring-primary/25`}
              >
                <span
                  className={`truncate text-[9px] font-medium sm:text-[10px] ${
                    active ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"
                  }`}
                >
                  {label}
                </span>
                {active ? <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> : null}
              </Card>

              {/* Narrow screens: details expand under the row */}
              <div className="max-h-0 overflow-hidden transition-[max-height] duration-300 ease-out group-hover:max-h-52 md:hidden">
                <NavHoverPanel detail={detail} label={label} className="mt-0 rounded-t-none border-t-0" />
              </div>

              {/* md+: flyout to the right; w-2 bridge keeps hover while moving the cursor onto the panel */}
              <div
                className="pointer-events-none absolute left-full top-0 z-[80] hidden pl-0 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 md:block"
              >
                <div className="flex items-stretch">
                  <div className="w-2 shrink-0 self-stretch" aria-hidden />
                  <div className="pointer-events-auto w-[min(240px,calc(100vw-6rem))] min-w-[200px]">
                    <NavHoverPanel detail={detail} label={label} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </aside>

      <div className="min-w-0 flex-1 space-y-2.5 sm:space-y-3">
        <div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-12 sm:items-end">
          <Card
            variant="metric"
            className="col-span-12 flex flex-col justify-between p-2 sm:col-span-3 sm:min-h-[4.5rem] sm:p-2.5"
          >
            <p className="text-[8px] font-medium uppercase tracking-wide text-white/75 sm:text-[9px]">
              {data.metrics[0].label}
            </p>
            <p className="text-base font-bold tabular-nums leading-tight text-white sm:text-lg">{data.metrics[0].value}</p>
            <p className="text-[8px] text-white/70 sm:text-[9px]">{data.metrics[0].sub}</p>
          </Card>
          <Card
            variant="metric"
            className="col-span-12 flex flex-col justify-between bg-gradient-to-br from-primary via-primary to-primary-hover p-2.5 sm:col-span-6 sm:min-h-[5.5rem] sm:p-3"
          >
            <p className="text-[9px] font-semibold uppercase tracking-wide text-white/85 sm:text-[10px]">
              {data.metrics[1].label}
            </p>
            <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">{data.metrics[1].value}</p>
            <p className="text-[9px] text-white/70">{data.metrics[1].sub}</p>
          </Card>
          <Card
            variant="metric"
            className="col-span-12 flex flex-col justify-between p-2 sm:col-span-3 sm:min-h-[4.5rem] sm:p-2.5"
          >
            <p className="text-[8px] font-medium uppercase tracking-wide text-white/75 sm:text-[9px]">
              {data.metrics[2].label}
            </p>
            <p className="text-base font-bold tabular-nums leading-tight text-white sm:text-lg">{data.metrics[2].value}</p>
            <p className="text-[8px] text-white/65 sm:text-[9px]">{data.metrics[2].sub}</p>
          </Card>
        </div>

        <Card variant="chartShell" className="p-2.5 pt-3 sm:p-3">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[9px] font-semibold text-neutral-300 sm:text-[10px]">{data.chart.title}</p>
              <p className="text-[8px] text-neutral-500 sm:text-[9px]">{data.chart.sub}</p>
            </div>
            <p className="text-[9px] font-bold tabular-nums text-primary sm:text-[10px]">{data.chart.total}</p>
          </div>
          <div className="flex h-20 items-end justify-between gap-1 px-0.5 pb-0 sm:h-24 md:h-28">
            {data.chart.bars.map((h, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className="w-full max-w-[2rem] rounded-t-md bg-gradient-to-t from-primary to-primary-hover/90 shadow-sm shadow-primary/15"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between gap-1 border-t border-neutral-800/80 pt-1.5">
            {CHART_DAYS.map((d, i) => (
              <span
                key={`chart-day-${i}`}
                className="flex-1 text-center text-[8px] font-medium text-neutral-600 sm:text-[9px]"
              >
                {d}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
