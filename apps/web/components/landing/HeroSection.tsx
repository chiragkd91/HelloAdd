"use client";

import { motion } from "framer-motion";
import { ButtonLink } from "@/components/ui/Button";
import { DashboardMockup } from "@/components/landing/DashboardMockup";

const platforms = [
  { name: "Facebook", hoverClass: "hover:text-[#1877F2]" },
  { name: "Instagram", hoverClass: "hover:text-[#E4405F]" },
  { name: "Google", hoverClass: "hover:text-[#4285F4]" },
  { name: "LinkedIn", hoverClass: "hover:text-[#0A66C2]" },
  { name: "YouTube", hoverClass: "hover:text-[#FF0000]" },
  { name: "Twitter", hoverClass: "hover:text-[#1DA1F2]" },
];

function PlayIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7-11-7z" />
    </svg>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-visible bg-gradient-hero-soft bg-fog px-6 pb-16 pt-10 md:pb-24 md:pt-14">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-mesh-purple opacity-100"
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-14">
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              For CMOs tired of 10 tabs
            </p>
            <h1 className="mt-4 text-balance-safe text-4xl font-bold leading-[1.08] tracking-tight text-dark md:text-5xl lg:text-[3.35rem]">
              Sab Ads.{" "}
              <span className="text-primary">
                Ek Jagah.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-neutral-600 lg:mx-0 lg:text-lg">
              Meta, Google, LinkedIn, YouTube. All running, all in one dashboard.
              Built because we got tired of logging into 10 tools ourselves.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <ButtonLink href="/register" variant="primary" className="px-8 py-3.5 text-base">
                Try it free
              </ButtonLink>
              <ButtonLink href="#demo" variant="heroGhostLight" className="px-8 py-3.5 text-base">
                <PlayIcon />
                See a 2-min demo
              </ButtonLink>
            </div>
            <p className="mt-6 text-sm text-neutral-500">
              Free while we&rsquo;re in beta. No card. Break it and tell us.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:justify-start"
          >
            {platforms.map((p) => (
              <span
                key={p.name}
                className={`text-sm font-semibold text-neutral-500 grayscale transition-all duration-300 hover:grayscale-0 ${p.hoverClass}`}
              >
                {p.name}
              </span>
            ))}
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="relative mx-auto w-full max-w-lg lg:max-w-none"
          id="demo"
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
            aria-hidden
          />
          <div className="relative rotate-2 rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-[0_24px_64px_-12px_rgba(51,51,46,0.12)] transition-transform duration-500 hover:rotate-0">
            <DashboardMockup />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
