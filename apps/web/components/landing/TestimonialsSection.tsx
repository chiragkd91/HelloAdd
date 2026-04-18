"use client";

import { motion } from "framer-motion";

const quotes = [
  {
    attribution: "Rakesh \u2014 CMO, TechVista (beta since Feb)",
    quote:
      "Saved me from opening 8 tabs every morning. That alone is worth it tbh.",
  },
  {
    attribution: "Priya \u2014 Growth Lead, Swiftly",
    quote:
      "The AI caught a dead Meta campaign we hadn\u2019t noticed for 3 days. That one alert covered our Hello Add cost for the year.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="border-t border-sand bg-fog px-6 py-24">
      <div className="relative mx-auto max-w-7xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary">Early users</p>
        <h2 className="mt-3 text-center text-2xl font-bold tracking-tight text-dark md:text-3xl">
          What our beta users actually said
        </h2>
        <div className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-2">
          {quotes.map((q, i) => (
            <motion.div
              key={q.attribution}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
            >
              <div className="relative flex h-full flex-col rounded-2xl border border-neutral-200/90 bg-white p-10 shadow-sm transition-[box-shadow] hover:shadow-md">
                <span className="pointer-events-none absolute -left-1 -top-2 text-6xl font-serif leading-none text-primary/20" aria-hidden>
                  &ldquo;
                </span>
                <p className="relative z-10 text-lg italic leading-relaxed text-neutral-700">&ldquo;{q.quote}&rdquo;</p>
                <p className="mt-8 text-sm font-bold text-dark">{q.attribution}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
