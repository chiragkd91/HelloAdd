"use client";

import Link from "next/link";
import { DASHBOARD_REGISTER_URL } from "@/lib/dashboardApi";
import { motion } from "framer-motion";

export function CTASection() {
  return (
    <section className="bg-fog px-6 pb-24 pt-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-primary/20 bg-gradient-brand px-8 py-16 text-center text-white shadow-brand md:px-12 md:py-20"
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-black/10 blur-2xl"
          aria-hidden
        />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
            Alright, ready to stop tab-hopping?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/95">
            Free while we&rsquo;re in beta. Sign up, poke around, tell us what&rsquo;s broken.
          </p>
          <div className="mt-10 flex justify-center">
            <Link
              href={DASHBOARD_REGISTER_URL}
              className="inline-flex min-h-[52px] min-w-[200px] items-center justify-center rounded-2xl bg-white px-10 py-3.5 text-base font-bold text-primary shadow-xl transition-colors hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Take me in
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/75">No card. 14-day full access on paid plans.</p>
        </div>
      </motion.div>
    </section>
  );
}
