"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const bento = [
  {
    title: "All your paid ads, one screen",
    body: "Meta, Google, LinkedIn. Live numbers, no refresh button. This is the main thing you'll use.",
    span: "md:col-span-2",
    variant: "wide" as const,
  },
  {
    title: "AI that shouts when stuff breaks",
    body: "Dead campaign burning money? You'll know before your coffee's cold.",
    span: "",
    variant: "compact" as const,
  },
  {
    title: "Agency white-label",
    body: "Reports and client portal with your logo and colours—not ours.",
    span: "",
    variant: "compact" as const,
  },
  {
    title: "Analytics & reports your board reads",
    body: "PDF or Excel, MER and platform mix—clear enough for Monday leadership.",
    span: "md:col-span-2",
    variant: "dark" as const,
  },
];

function IconHub({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="19" r="2.5" />
      <circle cx="19" cy="19" r="2.5" />
      <path d="M12 7.5v3M7.5 17l3-2M16.5 17l-3-2" strokeLinecap="round" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3 5 6v5c0 4.5 3.2 8.7 7 10 3.8-1.3 7-5.5 7-10V6l-7-3Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconBrand({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h4M7 14h10" strokeLinecap="round" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 19h16M7 15l3-4 3 2 5-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 15V9M13 13V7M18 11V5" strokeLinecap="round" />
    </svg>
  );
}

const icons = [IconHub, IconShield, IconBrand, IconChart];

export function FeaturesSection() {
  return (
    <section className="border-t border-sand bg-fog px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">What you actually get</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-dark md:text-3xl lg:text-[2rem]">
            Here&rsquo;s what&rsquo;s inside.
          </h2>
          <p className="mt-4 text-sm text-neutral-600 md:text-base">
            Eight things we built because we needed them ourselves—shown here as a tighter bento. Not eighty.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {bento.map((f, i) => {
            const Icon = icons[i];
            const isDark = f.variant === "dark";
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-32px" }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
                className={f.span}
              >
                <div
                  className={`group flex h-full flex-col rounded-2xl border p-8 transition-[border-color,box-shadow] ${
                    isDark
                      ? "border-primary/30 bg-plum text-white shadow-brand"
                      : "border-neutral-200/90 bg-white shadow-sm hover:border-primary/25 hover:shadow-md"
                  }`}
                >
                  {Icon ? (
                    <div
                      className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${
                        isDark ? "bg-white/10 text-primary" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                  ) : null}
                  <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-dark"}`}>{f.title}</h3>
                  <p className={`mt-3 flex-1 text-sm leading-relaxed ${isDark ? "text-white/80" : "text-neutral-600"}`}>
                    {f.body}
                  </p>
                  {isDark ? (
                    <Link
                      href="/features"
                      className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary transition-[gap] hover:gap-3"
                    >
                      Explore features
                      <span aria-hidden>→</span>
                    </Link>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
