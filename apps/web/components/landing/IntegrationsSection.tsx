"use client";

import { motion } from "framer-motion";

const platforms = [
  "Meta",
  "Google Ads",
  "LinkedIn",
  "YouTube",
  "Twitter",
  "Shopify",
  "Razorpay",
  "WhatsApp",
  "Slack",
  "HubSpot",
];

export function IntegrationsSection() {
  return (
    <section className="border-t border-sand bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Plays well with
        </p>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-3 text-2xl font-bold tracking-tight text-dark md:text-3xl"
        >
          Ten tools we already connect to.
        </motion.h2>
        <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-gradient-brand" aria-hidden />
        <p className="mx-auto mt-4 max-w-2xl text-sm text-neutral-600 md:text-base">
          More coming, based on what beta users ask for. DM us if yours is missing
          and we&rsquo;ll usually ship it the same week.
        </p>
        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {platforms.map((name, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="flex min-h-[52px] items-center justify-center rounded-xl border border-neutral-200/90 bg-gradient-to-b from-white to-neutral-50 px-3 py-3 text-center text-sm font-semibold text-neutral-800 shadow-sm transition-[border-color,box-shadow] hover:border-primary/35 hover:shadow-md"
            >
              {name}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
