"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const easeOut = [0.22, 1, 0.36, 1] as const;

function getCardMotionProps(index: number, reduced: boolean | null) {
  if (reduced) {
    return {};
  }
  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-40px" },
    transition: { duration: 0.52, delay: index * 0.06, ease: easeOut },
  };
}

function getHoverLiftProps(reduced: boolean | null) {
  if (reduced) return {};
  return {
    whileHover: { y: -5, transition: { duration: 0.22, ease: easeOut } },
    whileTap: { scale: 0.995 },
  };
}

/** Icon wells scale/tilt when hovering anywhere on the card (with .group on the card). */
const iconWell =
  "transition-transform duration-300 ease-out will-change-transform motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-2";

const MotionLink = motion(Link);

function IconLayers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" strokeLinejoin="round" />
      <path d="m2 17 10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconGauge({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 14v3M6 20h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
      <path d="M4 14a8 8 0 1 1 16 0" strokeLinecap="round" />
    </svg>
  );
}

function IconSpark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 3v3M12 18v3M4.2 12H7M17 12h2.8M6.3 6.3 8.5 8.5M15.5 15.5l2.2 2.2M6.3 17.7 8.5 15.5M15.5 8.5l2.2-2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" strokeLinecap="round" />
    </svg>
  );
}

function IconFile({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" strokeLinejoin="round" />
      <path d="M14 2v6h6M8 13h8M8 17h6" strokeLinecap="round" />
    </svg>
  );
}

function IconPlug({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 22v-5M9 8V3M15 8V3M5 12a7 7 0 0 0 14 0H5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M6 12h4M14 12h4M6 16h4M14 16h4M10 22v-4h4v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FeaturesPageContent() {
  const reducedMotion = useReducedMotion();
  const hoverLift = getHoverLiftProps(reducedMotion);

  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-4">
      <div className="grid auto-rows-min gap-5 md:grid-cols-12 md:gap-6">
        {/* Row 1 — hero + stack */}
        <motion.article
          {...getCardMotionProps(0, reducedMotion)}
          {...hoverLift}
          className="group relative overflow-hidden rounded-3xl border border-white/10 bg-hero-elevated p-8 text-white shadow-2xl shadow-black/40 md:col-span-12 lg:col-span-7 lg:min-h-[280px] lg:p-10"
        >
          <motion.div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/25 blur-3xl"
            aria-hidden
            animate={
              reducedMotion
                ? undefined
                : { scale: [1, 1.06, 1], opacity: [0.5, 0.72, 0.5] }
            }
            transition={reducedMotion ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute bottom-0 right-0 h-32 w-64 bg-gradient-to-tl from-primary/30 to-transparent opacity-80"
            aria-hidden
            animate={
              reducedMotion
                ? undefined
                : { opacity: [0.65, 0.9, 0.65], x: [0, 6, 0] }
            }
            transition={reducedMotion ? undefined : { duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/90">Core</p>
          <div className="mt-4 flex items-start gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-primary-foreground ring-1 ring-white/15 ${iconWell}`}
            >
              <IconLayers className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">Unified paid command center</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
                Meta, Google, LinkedIn, YouTube — live spend and status in one feed. Fewer tabs, one source of truth for
                what&apos;s running and what&apos;s pacing.
              </p>
            </div>
          </div>
        </motion.article>

        <div className="flex flex-col gap-5 md:col-span-12 lg:col-span-5">
          <motion.article
            {...getCardMotionProps(1, reducedMotion)}
            {...hoverLift}
            className="group flex flex-1 flex-col rounded-3xl border-l-[5px] border-primary bg-white p-7 shadow-sm ring-1 ring-neutral-200/80"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ${iconWell}`}>
              <IconGauge className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-dark">Budgets &amp; pacing</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600">
              See live spend against plan, catch overspend early, and keep finance aligned with the same numbers your
              team sees.
            </p>
          </motion.article>

          <motion.article
            {...getCardMotionProps(2, reducedMotion)}
            {...hoverLift}
            className="group flex flex-1 flex-col rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] to-fog p-7 shadow-sm ring-1 ring-primary/10"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ${iconWell}`}>
              <IconSpark className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-dark">AI guardrails</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-700">
              Automated checks on campaigns and accounts — get nudges when something looks off before it becomes an
              expensive surprise.
            </p>
          </motion.article>
        </div>

        {/* Row 2 — three equal */}
        <motion.article
          {...getCardMotionProps(3, reducedMotion)}
          {...hoverLift}
          className="group rounded-3xl border border-dashed border-neutral-300/90 bg-fog/80 p-7 md:col-span-12 md:grid-cols-1 lg:col-span-4"
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-dark ${iconWell}`}>
            <IconCalendar className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-dark">Scheduler &amp; calendar</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Plan organic and paid touchpoints on one calendar. See what goes live when — without juggling spreadsheets.
          </p>
        </motion.article>

        <motion.article
          {...getCardMotionProps(4, reducedMotion)}
          {...hoverLift}
          className="group rounded-3xl bg-plum p-7 text-white shadow-brand ring-1 ring-white/10 md:col-span-12 lg:col-span-4"
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-primary-foreground ${iconWell}`}>
            <IconFile className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-bold">Reports &amp; exports</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            Board-ready snapshots — PDF or Excel — with MER and platform mix so leadership and finance get clarity,
            not chaos.
          </p>
        </motion.article>

        <motion.article
          {...getCardMotionProps(5, reducedMotion)}
          {...hoverLift}
          className="group rounded-3xl border border-neutral-200 bg-white p-7 shadow-[0_12px_40px_-12px_rgba(51,51,46,0.12)] md:col-span-12 lg:col-span-4"
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-dark ${iconWell}`}>
            <IconPlug className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-dark">Integrations</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Connect the ad platforms and tools you already use. OAuth flows and tokens stay scoped to what you approve.
          </p>
          <p className="mt-3 text-xs font-medium text-neutral-500">
            Meta · Google Ads · LinkedIn · YouTube · WhatsApp · Razorpay · and more in beta
          </p>
        </motion.article>

        {/* Row 3 — agency + alerts */}
        <motion.article
          {...getCardMotionProps(6, reducedMotion)}
          {...hoverLift}
          className="group relative overflow-hidden rounded-3xl border-2 border-transparent bg-white p-8 shadow-md md:col-span-12 lg:col-span-6"
          style={{
            backgroundImage:
              "linear-gradient(white, white), linear-gradient(135deg, #6845ab 0%, #e60023 50%, #6845ab 100%)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
          }}
        >
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ${iconWell}`}>
            <IconBuilding className="h-6 w-6" />
          </span>
          <h2 className="mt-5 text-xl font-bold text-dark">Agency &amp; client portal</h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            Multi-client workspaces, white-label reporting, and a client-facing view that carries your brand — not ours.
            Built for agencies scaling without losing the plot.
          </p>
          <Link
            href="/agencies"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary transition-[gap] hover:gap-3"
          >
            How agencies use Hello Add
            <span aria-hidden>→</span>
          </Link>
        </motion.article>

        <motion.article
          {...getCardMotionProps(7, reducedMotion)}
          {...hoverLift}
          className="group flex flex-col justify-between rounded-3xl bg-[linear-gradient(160deg,#f6f6f3_0%,#fff_45%,#e5e5e0_100%)] p-8 ring-1 ring-neutral-200/90 md:col-span-12 lg:col-span-6"
        >
          <div>
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-dark/5 text-dark ${iconWell}`}>
              <IconBell className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-xl font-bold text-dark">Alerts — WhatsApp &amp; email</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              Push the signal to where your team already looks. Configurable alerts so Friday-night fires don&apos;t wait
              for Monday morning.
            </p>
          </div>
        </motion.article>

        {/* Row 4 — full strip + team */}
        <motion.article
          {...getCardMotionProps(8, reducedMotion)}
          {...hoverLift}
          className="group flex flex-col gap-4 rounded-3xl border border-sand bg-white px-8 py-8 md:col-span-12 lg:col-span-8 lg:flex-row lg:items-center lg:gap-10"
        >
          <div className="shrink-0 rounded-2xl bg-gradient-brand px-5 py-4 text-center text-white shadow-brand transition-transform duration-300 ease-out motion-safe:group-hover:scale-105">
            <p className="text-2xl font-black tracking-tight">INR</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-90">IST-first</p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-dark">Built for India &amp; APAC</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              INR-friendly defaults, timezone-aware reporting, Razorpay for subscriptions, and WhatsApp in the loop — not
              bolted on after the fact.
            </p>
          </div>
        </motion.article>

        <motion.article
          {...getCardMotionProps(9, reducedMotion)}
          {...hoverLift}
          className="group rounded-3xl border border-neutral-200 bg-fog p-8 md:col-span-12 lg:col-span-4"
        >
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white text-dark shadow-sm ring-1 ring-neutral-200 ${iconWell}`}>
            <IconUsers className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-dark">Team &amp; roles</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Viewer through owner — invite teammates and keep sensitive actions behind the right permission level.
          </p>
        </motion.article>
      </div>

      <motion.div
        {...getCardMotionProps(10, reducedMotion)}
        className="mt-14 flex flex-col items-center justify-center gap-4 sm:flex-row"
      >
        <MotionLink
          href="/pricing"
          className="inline-flex min-h-[48px] items-center justify-center rounded-btn bg-gradient-brand px-8 text-sm font-bold text-white shadow-md transition hover:opacity-100"
          animate={
            reducedMotion
              ? undefined
              : {
                  scale: [1, 1.035, 1],
                  boxShadow: [
                    "0 10px 25px -8px rgba(104, 69, 171, 0.45)",
                    "0 14px 36px -6px rgba(104, 69, 171, 0.55)",
                    "0 10px 25px -8px rgba(104, 69, 171, 0.45)",
                  ],
                }
          }
          transition={
            reducedMotion
              ? undefined
              : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          }
          whileHover={reducedMotion ? undefined : { scale: 1.06 }}
          whileTap={reducedMotion ? undefined : { scale: 0.98 }}
        >
          See plans &amp; trial
        </MotionLink>
        <Link href="/" className="text-sm font-semibold text-primary hover:underline">
          ← Back to home
        </Link>
      </motion.div>
    </div>
  );
}
