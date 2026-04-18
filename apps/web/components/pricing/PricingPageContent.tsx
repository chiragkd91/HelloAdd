"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const plans = [
  { name: "Starter", monthly: 4999, popular: false },
  { name: "Growth", monthly: 12999, popular: true },
  { name: "Agency", monthly: 34999, popular: false },
] as const;

function formatInr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

type Cell = "yes" | "no" | string;

const comparisonRows: { feature: string; starter: Cell; growth: Cell; agency: Cell }[] = [
  { feature: "Brands", starter: "1", growth: "3", agency: "Unlimited" },
  { feature: "Platforms", starter: "3", growth: "All", agency: "All" },
  { feature: "Users", starter: "2", growth: "10", agency: "Unlimited" },
  { feature: "Campaign tracking", starter: "yes", growth: "yes", agency: "yes" },
  { feature: "Budget alerts", starter: "yes", growth: "yes", agency: "yes" },
  { feature: "PDF reports", starter: "yes", growth: "yes", agency: "yes" },
  { feature: "Excel export", starter: "no", growth: "yes", agency: "yes" },
  { feature: "Email alerts", starter: "yes", growth: "yes", agency: "yes" },
  { feature: "WhatsApp alerts", starter: "no", growth: "yes", agency: "yes" },
  { feature: "AI Error Detection", starter: "no", growth: "yes", agency: "yes" },
  { feature: "AI Budget Optimizer", starter: "no", growth: "yes", agency: "yes" },
  { feature: "Lead capture", starter: "no", growth: "yes", agency: "yes" },
  { feature: "Attribution engine", starter: "no", growth: "yes", agency: "yes" },
  { feature: "Client portal (white-label)", starter: "no", growth: "no", agency: "yes" },
  { feature: "API access", starter: "no", growth: "no", agency: "yes" },
  { feature: "Data history", starter: "7 days", growth: "90 days", agency: "Unlimited" },
  { feature: "Support level", starter: "Standard", growth: "Priority", agency: "Dedicated + SLA" },
];

function CellDisplay({ value }: { value: Cell }) {
  if (value === "yes") {
    return <span className="text-primary">✓</span>;
  }
  if (value === "no") {
    return <span className="text-neutral-400">—</span>;
  }
  return <span className="text-sm text-neutral-700">{value}</span>;
}

const faqs = [
  {
    q: "Can I connect all my ad accounts?",
    a: "Yes. Hello Add connects to Meta, Google Ads, LinkedIn, and more from one place. Connect the accounts you use; you can add or remove integrations anytime.",
  },
  {
    q: "Is my data secure?",
    a: "We use industry-standard encryption in transit and at rest, role-based access in your workspace, and infrastructure practices aligned with common SaaS security expectations. Ask us for our security overview anytime.",
  },
  {
    q: "What happens after the 14-day trial?",
    a: "You can choose a plan and add a payment method, or your workspace moves to a limited state until you subscribe. We’ll remind you before the trial ends — no surprise charges.",
  },
  {
    q: "Can I change plans anytime?",
    a: "Yes. Upgrade or downgrade from billing settings (when enabled). Proration and effective dates follow your invoice cycle.",
  },
  {
    q: "UPI/Razorpay support? Yes",
    a: "Yes — UPI, cards, and net banking are supported via Razorpay (when billing is enabled on your account).",
  },
  {
    q: "Is there a setup fee?",
    a: "No. There’s no separate setup fee — you only pay the plan you choose after the trial if you continue.",
  },
];

export function PricingPageContent() {
  const [annual, setAnnual] = useState(false);

  const prices = useMemo(() => {
    return plans.map((p) => {
      const perMonth = annual ? Math.round(p.monthly * 0.85) : p.monthly;
      return { ...p, display: formatInr(perMonth) };
    });
  }, [annual]);

  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  function onSubmitContact(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <>
      <section className="border-b border-neutral-200 bg-gradient-to-b from-neutral-50 to-white px-6 py-14 md:py-20">
        <div className="mx-auto max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-3 text-lg text-neutral-600">Start free, upgrade when ready.</p>
            <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-neutral-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  !annual ? "bg-neutral-900 text-white shadow" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  annual ? "bg-neutral-900 text-white shadow" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Annual
                <span className="ml-2 text-xs font-bold text-primary">Save 15%</span>
              </button>
            </div>
          </motion.div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:items-stretch">
            {prices.map((p, i) => (
              <motion.div
                key={p.name}
                className="flex h-full min-h-0 flex-col"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
              >
                <Card
                  className={`relative flex h-full min-h-0 w-full flex-col p-8 ${
                    p.popular
                      ? "border-2 border-primary/45 bg-white shadow-[0_12px_48px_-16px_rgba(104,69,171,0.28)] ring-1 ring-primary/15"
                      : "border-2 border-neutral-200"
                  }`}
                >
                  {/* In-flow slot so the badge never overlaps the toggle or neighboring cards */}
                  <div className="mb-4 flex min-h-[2rem] shrink-0 items-center justify-center">
                    <span
                      className={
                        p.popular
                          ? "whitespace-nowrap rounded-full bg-primary-hover px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-md"
                          : "invisible whitespace-nowrap rounded-full px-5 py-1.5 text-[10px] font-bold uppercase"
                      }
                      aria-hidden={!p.popular}
                    >
                      Most popular
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900">{p.name}</h2>
                  <p className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tabular-nums text-neutral-900">{p.display}</span>
                    <span className="text-sm text-neutral-500">/mo</span>
                  </p>
                  {annual && (
                    <p className="mt-1 text-xs text-neutral-500">Billed annually (15% savings)</p>
                  )}
                  <ul className="mt-6 space-y-2 text-left text-sm text-neutral-600">
                    {p.name === "Starter" && (
                      <>
                        <li>1 brand, 3 platforms, 2 users</li>
                        <li>Basic reports (PDF + CSV)</li>
                        <li>Email alerts · 7-day history</li>
                        <li>Standard support</li>
                      </>
                    )}
                    {p.name === "Growth" && (
                      <>
                        <li>3 brands, all platforms, 10 users</li>
                        <li>AI Error Detection &amp; Budget Optimizer</li>
                        <li>WhatsApp alerts · 90-day history</li>
                        <li>Priority support</li>
                      </>
                    )}
                    {p.name === "Agency" && (
                      <>
                        <li>Unlimited brands · white-label portal</li>
                        <li>Custom branded reports &amp; API access</li>
                        <li>Dedicated account manager</li>
                        <li>SLA guarantee</li>
                      </>
                    )}
                  </ul>
                  {p.popular ? (
                    <Link
                      href="/register"
                      className="mt-auto inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-primary shadow-[0_4px_14px_rgba(0,0,0,0.08)] ring-1 ring-neutral-200/80 transition-colors hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Start free trial
                    </Link>
                  ) : (
                    <ButtonLink
                      href="/register"
                      variant="primary"
                      className="mt-auto min-h-[48px] w-full justify-center py-3"
                    >
                      Start free trial
                    </ButtonLink>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
          <p className="mt-10 text-sm text-neutral-500">
            14-day free trial · No credit card · Cancel anytime
          </p>
        </div>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-neutral-900">Compare all features</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-neutral-600">
            See exactly what&apos;s included in Starter, Growth, and Agency.
          </p>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-neutral-200 shadow-sm">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-900 text-white">
                  <th className="px-4 py-4 font-semibold">Feature</th>
                  <th className="px-4 py-4 font-semibold">Starter</th>
                  <th className="px-4 py-4 font-semibold text-primary">Growth</th>
                  <th className="px-4 py-4 font-semibold">Agency</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr
                    key={row.feature}
                    className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50/80"}
                  >
                    <td className="border-b border-neutral-100 px-4 py-3 font-medium text-neutral-800">
                      {row.feature}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-3 text-center">
                      <CellDisplay value={row.starter} />
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-3 text-center">
                      <CellDisplay value={row.growth} />
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-3 text-center">
                      <CellDisplay value={row.agency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-neutral-50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-neutral-900">Frequently asked questions</h2>
          <div className="mt-10 space-y-3">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm open:ring-1 open:ring-primary/20"
              >
                <summary className="cursor-pointer list-none font-semibold text-neutral-900 [&::-webkit-details-marker]:hidden">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-xl">
          <h2 className="text-center text-2xl font-bold text-neutral-900">Still not sure? Talk to us</h2>
          <p className="mt-2 text-center text-neutral-600">
            Leave your details — we&apos;ll get back within one business day. Or{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">
              explore the product
            </Link>{" "}
            first.
          </p>
          {submitted ? (
            <p className="mt-8 rounded-xl border border-primary/30 bg-primary/5 px-4 py-6 text-center text-sm font-medium text-primary">
              Thanks — we&apos;ve received your message. (Demo: connect this form to your CRM or email API in production.)
            </p>
          ) : (
            <form onSubmit={onSubmitContact} className="mt-10 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none ring-primary/20 focus:ring-2"
                  placeholder="Your name"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">Work email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none ring-primary/20 focus:ring-2"
                  placeholder="you@company.com"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">Message</span>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none ring-primary/20 focus:ring-2"
                  placeholder="Tell us about your team and ad spend…"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow transition hover:bg-primary/90"
              >
                Send message
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
