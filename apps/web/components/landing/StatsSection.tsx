"use client";

import { motion } from "framer-motion";

/**
 * Beta / trust strip — edit STATS when you have numbers you can defend.
 * See comment examples in array below.
 */
const STATS: { lead: string; tail: string }[] = [
  { lead: "Private beta", tail: " Invite-by-invite. We're early." },
  { lead: "7 platforms", tail: " Meta, Google, LinkedIn, YouTube, X, WhatsApp alerts" },
  { lead: "INR · IST", tail: " Defaults that match Indian teams" },
  { lead: "You shape the roadmap", tail: " Tell us what breaks first" },
];

const focusAreas = ["D2C", "SaaS", "Fintech", "Agencies", "EdTech", "Retail"];

export function StatsSection() {
  return (
    <section className="border-b border-white/10 bg-plum px-6 py-14 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Who we&apos;re building for
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {focusAreas.map((name) => (
            <span
              key={name}
              className="text-sm font-bold tracking-tight text-white/50 transition-colors hover:text-primary"
            >
              {name}
            </span>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-white/60">
          Industries we design for—not a client list. Honest beats impressive.
        </p>
        <div className="mx-auto mt-12 grid max-w-6xl gap-10 border-t border-white/10 pt-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STATS.map((s, i) => (
            <motion.div
              key={`${s.lead}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              className={`text-center ${i > 0 ? "lg:border-l lg:border-white/10 lg:pl-8" : ""}`}
            >
              <p className="text-2xl font-extrabold text-primary md:text-3xl">{s.lead}</p>
              <p className="mt-2 text-sm font-medium leading-snug text-white/60">{s.tail.trim()}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
