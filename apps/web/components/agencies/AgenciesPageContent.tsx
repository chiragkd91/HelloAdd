"use client";

import Link from "next/link";
import { motion } from "framer-motion";

function reveal(i: number) {
  return {
    initial: { opacity: 0, x: -8 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true, margin: "-40px" },
    transition: { duration: 0.35, delay: i * 0.04 },
  };
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPalette({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
      <circle cx="16.5" cy="10.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" />
    </svg>
  );
}

function IconWorkflow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="2" y="7" width="6" height="10" rx="1" />
      <rect x="9" y="5" width="6" height="14" rx="1" />
      <rect x="16" y="9" width="6" height="6" rx="1" />
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

function IconCode({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconHeadset({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M3 11a9 9 0 0 1 18 0v2a3 3 0 0 1-3 3h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 16v2a4 4 0 0 1-4 4h-1" strokeLinecap="round" />
    </svg>
  );
}

function IconInfinity({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const timeline = [
  {
    icon: IconUsers,
    title: "Every client on one roster",
    body: "Switch between brands without switching tools. Pacing, creatives, and alerts for every retainer — Meta, Google, LinkedIn, and YouTube — in a single workspace.",
  },
  {
    icon: IconPalette,
    title: "White-label that feels like yours",
    body: "PDFs, exports, and client-facing views carry your logo and colours — not a generic vendor template.",
  },
  {
    icon: IconGlobe,
    title: "Client portal",
    body: "A read-only lane clients actually use: performance snapshots without handing over ad-account passwords.",
  },
  {
    icon: IconWorkflow,
    title: "One workflow for the whole pod",
    body: "Juniors and leads share the same screens — fewer handoffs and fewer “which sheet is live?” moments.",
  },
  {
    icon: IconBell,
    title: "Alerts before the client pings you",
    body: "WhatsApp and email when spend, errors, or pacing drift — fix issues in hours, not Monday morning.",
  },
  {
    icon: IconCode,
    title: "API & automation",
    body: "On the Agency plan, wire Hello Add into CRMs, internal dashboards, or custom workflows.",
  },
];

export function AgenciesPageContent() {
  return (
    <div className="bg-sand">
      {/* Light editorial hero — not a dark / plum bar (differs from Features) */}
      <header className="border-b border-neutral-300/60 bg-gradient-hero-soft">
        <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-olive md:text-xs">For agencies</p>
          <h1 className="mt-4 max-w-3xl text-[2rem] font-bold leading-[1.08] tracking-tight text-dark md:text-5xl lg:text-[3rem]">
            Run every retainer from one Hello Add workspace
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600 md:text-xl">
            White-label reports, a client-ready portal, and the same pacing-and-alerts stack your strategists already
            love — scaled for agencies in India &amp; APAC.
          </p>
          <p className="mt-8 text-sm text-neutral-500">
            New here? See the{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">
              home page
            </Link>{" "}
            or full{" "}
            <Link href="/features" className="font-semibold text-primary hover:underline">
              product features
            </Link>
            .
          </p>
        </div>
      </header>

      {/* Vertical timeline — not a 12-col card grid */}
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-olive">Agency stack</h2>
        <p className="mt-2 text-lg font-semibold text-dark">What teams standardize on</p>
        <ol className="mt-12 space-y-0">
          {timeline.map((item, i) => {
            const Icon = item.icon;
            const isLast = i === timeline.length - 1;
            return (
              <motion.li key={item.title} {...reveal(i)} className="flex gap-5 md:gap-6">
                <div className="flex flex-col items-center">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-white text-primary shadow-sm">
                    <Icon className="h-4 w-4" />
                  </span>
                  {!isLast ? <span className="mt-2 h-10 w-px shrink-0 bg-primary/25" aria-hidden /> : null}
                </div>
                <div className={`pb-12 ${isLast ? "pb-0" : ""}`}>
                  <h3 className="text-base font-bold text-dark md:text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-700 md:text-base">{item.body}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </section>

      {/* Full-width bands — support + scale (no rounded cards) */}
      <section className="border-y border-neutral-300/50 bg-white">
        <div className="mx-auto grid max-w-6xl gap-0 md:grid-cols-2">
          <div className="border-b border-neutral-200 p-8 md:border-b-0 md:border-r md:p-12">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <IconHeadset className="h-5 w-5" />
            </span>
            <h2 className="mt-5 text-xl font-bold text-dark">Dedicated support &amp; SLA</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 md:text-base">
              Priority paths for Growth and Agency tiers — we&apos;re used to fire drills during launches and month-end
              reporting.
            </p>
            <Link href="/pricing" className="mt-5 inline-block text-sm font-bold text-primary hover:underline">
              Compare Agency vs Growth →
            </Link>
          </div>
          <div className="p-8 md:p-12">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-fog text-primary ring-1 ring-neutral-200">
              <IconInfinity className="h-5 w-5" />
            </span>
            <h2 className="mt-5 text-xl font-bold text-dark">Unlimited brands &amp; scale</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 md:text-base">
              On Agency: unlimited brands, unlimited users, and extended data history — you&apos;re not punished for
              growing the roster.
            </p>
            <p className="mt-3 text-xs text-neutral-500">Lower tiers have caps — see the pricing table.</p>
          </div>
        </div>
      </section>

      <blockquote className="mx-auto max-w-3xl border-l-[3px] border-primary bg-fog/50 px-6 py-10 md:px-10">
        <p className="text-lg font-medium italic leading-relaxed text-dark md:text-xl">
          &ldquo;Leads review all clients from one screen; juniors stay in the same workflow across accounts.&rdquo;
        </p>
        <footer className="mt-4 text-sm text-neutral-600">
          — From our{" "}
          <Link href="/case-studies" className="font-semibold text-primary hover:underline">
            case studies
          </Link>
        </footer>
      </blockquote>

      <section className="border-t border-neutral-300/50 bg-warm-light">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-12 text-center md:flex-row md:justify-center md:gap-8 md:py-14">
          <Link
            href="/pricing"
            className="rounded-btn bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary-hover"
          >
            See Agency pricing
          </Link>
          <Link href="/register" className="text-sm font-semibold text-primary hover:underline">
            Start free trial →
          </Link>
          <Link href="/features" className="text-sm font-medium text-neutral-600 hover:text-primary">
            All product features
          </Link>
        </div>
      </section>
    </div>
  );
}
