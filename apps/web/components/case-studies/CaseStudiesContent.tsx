"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type Story = {
  id: string;
  company: string;
  industry: string;
  title: string;
  challenge: string;
  solution: string;
  results: { label: string; value: string }[];
  quote: string;
  attribution: string;
};

const stories: Story[] = [
  {
    id: "techvista",
    company: "TechVista",
    industry: "B2B SaaS",
    title: "One dashboard replaced ten browser tabs for the CMO office",
    challenge:
      "The marketing team logged into Meta, Google, and LinkedIn separately every morning. Budget pacing lived in spreadsheets, and leadership asked for a single view of spend — there wasn’t one.",
    solution:
      "TechVista connected all ad accounts to Hello Add. The team now uses the unified campaign feed and budget command center for daily stand-ups, with the same numbers Finance sees.",
    results: [
      { label: "Time reclaimed", value: "~12 hrs/week" },
      { label: "Platforms unified", value: "Meta, Google, LinkedIn" },
      { label: "Reporting prep", value: "Minutes vs. hours" },
    ],
    quote:
      "We were spending four hours a day switching between platforms. Hello Add gave us that time back.",
    attribution: "Rakesh Sharma, CMO",
  },
  {
    id: "swiftly",
    company: "Swiftly",
    industry: "E‑commerce",
    title: "AI alerts stopped a runaway campaign on day one",
    challenge:
      "A performance campaign had gone stale but was still spending. The team didn’t catch it until the weekly review — by then, budget had already burned.",
    solution:
      "Hello Add’s AI error detector flagged the issue automatically. WhatsApp and email alerts went to the owner the same day, with enough context to pause and fix creative.",
    results: [
      { label: "Estimated waste prevented", value: "₹15,000+/day" },
      { label: "Time to detect", value: "Same day" },
      { label: "Payback", value: "ROI in week one" },
    ],
    quote:
      "The AI error detector caught a dead campaign that was burning ₹15,000 a day. ROI paid for itself in day one.",
    attribution: "Priya Mehta, Growth Lead",
  },
  {
    id: "northwind",
    company: "Northwind Media",
    industry: "Performance agency",
    title: "Twelve retainers, one workspace for strategists and account leads",
    challenge:
      "Account managers juggled different logins and decks per client. Scaling headcount meant more chaos, not more clarity.",
    solution:
      "The agency standardized on Hello Add for pacing, alerts, and client-ready snapshots. Leads review all clients from one screen; juniors stay in the same workflow across accounts.",
    results: [
      { label: "Clients on platform", value: "12+" },
      { label: "Team throughput", value: "~3× vs. prior tools" },
      { label: "Onboarding", value: "One training path" },
    ],
    quote: "We manage twelve clients from one screen now. Our team is three times more productive.",
    attribution: "Arjun Patel, Founder",
  },
];

function cardMotion(i: number) {
  return {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-48px" },
    transition: { duration: 0.45, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] },
  };
}

export function CaseStudiesContent() {
  return (
    <div className="bg-sand">
      {/* Masthead-style hero — not centered purple gradient */}
      <header className="border-b border-neutral-300/60 bg-gradient-hero-soft">
        <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-olive md:text-xs">Customer stories</p>
          <h1 className="mt-4 max-w-3xl text-[2rem] font-bold leading-[1.08] tracking-tight text-dark md:text-5xl lg:text-[3rem]">
            Outcomes from teams who consolidated ad ops
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600 md:text-xl">
            CMOs, growth leads, and agencies in India &amp; APAC — fewer logins, faster decisions, budgets that stay
            under control. Fictionalized composites for illustration; your mileage in beta may vary.
          </p>
        </div>
      </header>

      {/* Stories — editorial chapters, no Card components */}
      <div className="mx-auto max-w-6xl px-6">
        {stories.map((story, index) => (
          <motion.article
            key={story.id}
            id={story.id}
            {...cardMotion(index)}
            className="border-b border-neutral-300/50 py-14 last:border-b-0 md:py-20"
          >
            <div className="grid gap-10 md:grid-cols-12 md:gap-12">
              <div className="md:col-span-4">
                <div className="flex items-start gap-4 md:block">
                  <span
                    className="font-mono text-4xl font-bold tabular-nums leading-none text-primary/35 md:text-5xl"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1 md:mt-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">{story.industry}</p>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-dark md:text-3xl">{story.company}</p>
                  </div>
                </div>
              </div>
              <div className="md:col-span-8">
                <h2 className="text-xl font-semibold leading-snug text-dark md:text-2xl md:leading-snug">{story.title}</h2>

                <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-10">
                  <div>
                    <p className="border-b border-neutral-300/80 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-olive">
                      Situation
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-700 md:text-base">{story.challenge}</p>
                  </div>
                  <div>
                    <p className="border-b border-neutral-300/80 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-olive">
                      Shift
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-700 md:text-base">{story.solution}</p>
                  </div>
                </div>

                <div className="mt-10 border-t border-dashed border-neutral-400/60 pt-6 text-sm leading-relaxed text-neutral-700">
                  {story.results.map((r, i) => (
                    <span key={r.label}>
                      {i > 0 ? <span className="text-neutral-300"> · </span> : null}
                      <span className="font-semibold text-dark">{r.value}</span>
                      <span className="text-neutral-500"> ({r.label})</span>
                    </span>
                  ))}
                </div>

                <figure className="mt-10 border-l-[3px] border-primary bg-white/60 px-6 py-5 md:px-8">
                  <blockquote className="text-base font-medium italic leading-relaxed text-dark md:text-lg">
                    &ldquo;{story.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-4 text-sm font-semibold not-italic text-neutral-600">
                    — {story.attribution}
                  </figcaption>
                </figure>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      {/* Soft closing — not gradient CTA band */}
      <section className="border-t border-neutral-300/50 bg-warm-light">
        <div className="mx-auto max-w-3xl px-6 py-12 text-center md:py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-olive">Next step</p>
          <p className="mt-4 text-lg font-medium text-dark md:text-xl">Want similar clarity in your workspace?</p>
          <p className="mt-2 text-neutral-600">
            Start a 14-day trial — no credit card. Connect accounts and see spend in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold">
            <Link
              href="/register"
              className="rounded-btn bg-primary px-6 py-2.5 text-primary-foreground shadow-sm transition hover:bg-primary-hover"
            >
              Start free trial
            </Link>
            <Link href="/pricing" className="text-primary underline decoration-primary/35 underline-offset-4 hover:decoration-primary">
              View pricing
            </Link>
            <Link href="/contact" className="text-neutral-600 hover:text-primary">
              Contact
            </Link>
          </div>
          <p className="mt-10 text-sm text-neutral-500">
            <Link href="/agencies" className="font-medium text-primary hover:underline">
              Agencies
            </Link>
            {" · "}
            <Link href="/features" className="font-medium text-primary hover:underline">
              Features
            </Link>
            {" · "}
            <Link href="/" className="font-medium text-neutral-600 hover:text-primary">
              Home
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
