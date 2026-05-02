"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ButtonLink } from "@/components/ui/Button";
import { DASHBOARD_REGISTER_URL } from "@/lib/dashboardApi";
import { Card } from "@/components/ui/Card";

const plans = [
  {
    name: "Starter",
    monthly: 4999,
    detail: "1 brand · 3 platforms · 2 users · basic reports",
    popular: false,
  },
  {
    name: "Growth",
    monthly: 12999,
    detail: "3 brands · all platforms · 10 users · AI features",
    popular: true,
  },
  {
    name: "Agency",
    monthly: 34999,
    detail: "Unlimited brands · white-label · dedicated support",
    popular: false,
  },
];

function formatInr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  const prices = useMemo(() => {
    return plans.map((p) => {
      const perMonth = annual ? Math.round(p.monthly * 0.85) : p.monthly;
      return { ...p, display: formatInr(perMonth) };
    });
  }, [annual]);

  return (
    <section className="border-t border-sand bg-fog px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Pricing</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-dark md:text-3xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-neutral-600">14-day free trial — no credit card.</p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-neutral-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                !annual ? "bg-fog text-dark shadow-sm" : "text-neutral-600 hover:text-dark"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                annual ? "bg-fog text-dark shadow-sm" : "text-neutral-600 hover:text-dark"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs font-bold text-primary">15% off</span>
            </button>
          </div>
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:items-start">
          {prices.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
              className={p.popular ? "lg:-mt-2 lg:mb-2" : ""}
            >
              <Card
                className={`relative flex h-full flex-col rounded-2xl p-10 pt-12 ${
                  p.popular
                    ? "border-2 border-primary/45 bg-white shadow-[0_12px_48px_-16px_rgba(104,69,171,0.28)] ring-1 ring-primary/15"
                    : "border-neutral-200 bg-white"
                }`}
              >
                {p.popular ? (
                  <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary-hover px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-md">
                    Most popular
                  </div>
                ) : null}
                <h3 className="text-xl font-bold text-dark">{p.name}</h3>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tabular-nums text-dark">{p.display}</span>
                  <span className="text-sm text-neutral-500">/mo</span>
                </p>
                {annual ? (
                  <p className="mt-1 text-xs text-neutral-500">Billed annually (15% savings)</p>
                ) : null}
                <p className="mt-6 flex-1 text-sm text-neutral-600">{p.detail}</p>
                {p.popular ? (
                  <Link
                    href={DASHBOARD_REGISTER_URL}
                    className="mt-10 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-primary shadow-[0_4px_14px_rgba(0,0,0,0.08)] ring-1 ring-neutral-200/80 transition-colors hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Start free trial
                  </Link>
                ) : (
                  <ButtonLink href={DASHBOARD_REGISTER_URL} variant="primary" className="mt-10 w-full justify-center">
                    Start free trial
                  </ButtonLink>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-neutral-500">
          All plans include a 14-day free trial — no credit card required.{" "}
          <Link href="/pricing" className="font-semibold text-primary hover:underline">
            Compare features
          </Link>
        </p>
      </div>
    </section>
  );
}
