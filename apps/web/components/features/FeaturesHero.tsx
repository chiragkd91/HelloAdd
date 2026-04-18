"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const easeOut = [0.22, 1, 0.36, 1] as const;

export function FeaturesHero() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <header className="border-b border-neutral-800/80 bg-hero px-6 pb-14 pt-12 text-white md:pb-16 md:pt-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/80">Product</p>
          <h1 className="mt-3 max-w-3xl text-2xl font-bold tracking-tight md:text-4xl md:leading-tight">
            Everything in Hello Add — in one place
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
            Unified paid + organic, budgets, AI guardrails, reports, agency tooling, and India-first defaults — laid out
            below so you can see what ships today.
          </p>
          <p className="mt-6 text-sm text-white/60">
            New here? Start on the{" "}
            <Link
              href="/"
              className="font-semibold text-primary-foreground underline decoration-primary/60 underline-offset-2 hover:decoration-primary-foreground"
            >
              home page
            </Link>{" "}
            or compare{" "}
            <Link
              href="/pricing"
              className="font-semibold text-primary-foreground underline decoration-primary/60 underline-offset-2 hover:decoration-primary-foreground"
            >
              plans
            </Link>
            .
          </p>
        </div>
      </header>
    );
  }

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="relative overflow-hidden border-b border-neutral-800/80 bg-hero px-6 pb-14 pt-12 text-white md:pb-16 md:pt-16"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: easeOut, delay: 0.1 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-96 bg-gradient-to-r from-primary/15 to-transparent blur-2xl"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: easeOut, delay: 0.25 }}
      />
      <div className="relative mx-auto max-w-7xl">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easeOut, delay: 0.05 }}
          className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/80"
        >
          Product
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut, delay: 0.12 }}
          className="mt-3 max-w-3xl text-2xl font-bold tracking-tight md:text-4xl md:leading-tight"
        >
          Everything in Hello Add — in one place
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut, delay: 0.22 }}
          className="mt-4 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg"
        >
          Unified paid + organic, budgets, AI guardrails, reports, agency tooling, and India-first defaults — laid out
          below so you can see what ships today.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easeOut, delay: 0.34 }}
          className="mt-6 text-sm text-white/60"
        >
          New here? Start on the{" "}
          <Link
            href="/"
            className="font-semibold text-primary-foreground underline decoration-primary/60 underline-offset-2 hover:decoration-primary-foreground"
          >
            home page
          </Link>{" "}
          or compare{" "}
          <Link
            href="/pricing"
            className="font-semibold text-primary-foreground underline decoration-primary/60 underline-offset-2 hover:decoration-primary-foreground"
          >
            plans
          </Link>
          .
        </motion.p>
      </div>
    </motion.header>
  );
}
