"use client";

import Link from "next/link";
import { useRef, type ElementRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/agencies", label: "Agencies" },
      { href: "/case-studies", label: "Case Studies" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/blog", label: "Blog" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/changelog", label: "Changelog" },
      { href: "/help", label: "Help center" },
      { href: "/docs/api", label: "API" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/security", label: "Security" },
    ],
  },
];

function SocialLinks() {
  return (
    <div className="flex gap-4">
      <a
        href="https://twitter.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-neutral-500 transition-colors hover:text-primary"
        aria-label="Twitter"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      <a
        href="https://linkedin.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-neutral-500 transition-colors hover:text-primary"
        aria-label="LinkedIn"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
      <a
        href="https://youtube.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-neutral-500 transition-colors hover:text-primary"
        aria-label="YouTube"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </a>
    </div>
  );
}

export function Footer() {
  const footerRef = useRef<ElementRef<"footer">>(null);
  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "end start"],
  });
  /** Moves with scroll while the footer passes the viewport */
  const parallaxY = useTransform(scrollYProgress, [0, 1], [56, -56]);
  /** Slight opposite motion on “Add” for depth */
  const parallaxAdd = useTransform(scrollYProgress, [0, 1], [20, -36]);

  return (
    <footer
      ref={footerRef}
      className="relative mt-0 min-h-[min(48vh,480px)] overflow-hidden border-t border-sand bg-fog px-6 py-16 pb-28 text-sm text-neutral-600 md:pb-32"
    >
      {/* Big brand watermark — behind columns; decorative only */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div
          style={{ y: parallaxY }}
          className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-2 md:pb-6"
        >
          <div
            className="flex select-none items-baseline justify-center gap-2 font-watermark sm:gap-4 md:gap-6"
            style={{ fontSize: "clamp(3.5rem, 18vw, 14rem)" }}
          >
            <motion.span
              initial={{ opacity: 0, x: -56, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="leading-none tracking-[0.02em] text-hero/18"
            >
              Hello
            </motion.span>
            <motion.span
              style={{ y: parallaxAdd }}
              initial={{ opacity: 0, x: 56, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.08 }}
              className="leading-none tracking-[0.02em] text-plum/35"
            >
              Add
            </motion.span>
          </div>
        </motion.div>
        <motion.div
          className="absolute inset-x-0 bottom-8 flex justify-center md:bottom-12"
          initial={false}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <span
            className="h-px max-w-[min(90%,48rem)] bg-gradient-to-r from-transparent via-primary/25 to-transparent"
            aria-hidden
          />
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 md:grid-cols-5">
        <div className="md:col-span-1">
          <p className="text-lg font-bold text-dark">Hello Add</p>
          <p className="mt-2 max-w-xs leading-relaxed">Sab Ads. Ek Jagah. One workspace for paid and organic.</p>
          <div className="mt-6">
            <SocialLinks />
          </div>
          <p className="mt-8 max-w-xs border-t border-neutral-200/90 pt-6 text-xs leading-relaxed text-neutral-500">
            Made with love in India · © {new Date().getFullYear()} Hello Add
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">{col.title}</p>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.label + l.href}>
                  <Link href={l.href} className="transition-colors hover:text-primary hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
