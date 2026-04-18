"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";

const pain = [
  "10 browser tabs open, every single morning",
  "Budgets living in 4 Excel sheets and one WhatsApp forward",
  "Finding out you blew the budget when finance calls",
  "A campaign dies Friday night. You find out Monday.",
];

const solved = [
  "One login. For everything.",
  "Live spend. Live pacing. Zero spreadsheets.",
  "Hard budget caps that actually stop the ads",
  "WhatsApp alerts you\u2019ll actually read",
];

export function PainSolutionSection() {
  return (
    <section className="border-y border-sand bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          The before &amp; after
        </p>
        <h2 className="mt-3 text-center text-2xl font-bold tracking-tight text-dark md:text-3xl">
          You know the pain. Here&rsquo;s the fix.
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-2 md:items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4 }}
          >
            <Card className="flex h-full flex-col justify-between border-neutral-200 bg-fog p-10">
              <div>
                <p className="text-sm font-bold text-brand-red">The chaos</p>
                <h3 className="mt-4 text-2xl font-bold text-dark">Drowning in tabs &amp; spreadsheets</h3>
                <p className="mt-4 text-neutral-600">
                  Switching tools to see total spend? Manual exports and missed caps eat margin.
                </p>
              </div>
              <ul className="mt-8 space-y-4">
                {pain.map((line) => (
                  <li key={line} className="flex gap-3 text-neutral-600">
                    <span className="mt-0.5 text-brand-red" aria-hidden>
                      ✕
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4 }}
          >
            <Card className="flex h-full flex-col justify-between border-primary/25 bg-primary/[0.06] p-10 shadow-lg shadow-primary/10 ring-1 ring-primary/15">
              <div>
                <p className="text-sm font-bold text-primary">The clarity</p>
                <h3 className="mt-4 text-2xl font-bold text-dark">Hello Add, one workspace</h3>
                <p className="mt-4 text-neutral-600">
                  One login, live pacing, AI guardrails, and reports your finance team can trust.
                </p>
              </div>
              <ul className="mt-8 space-y-4">
                {solved.map((line) => (
                  <li key={line} className="flex gap-3 font-medium text-neutral-800">
                    <span className="mt-0.5 text-primary" aria-hidden>
                      ✓
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
