"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ButtonLink } from "@/components/ui/Button";

const links = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/agencies", label: "Agencies" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/blog", label: "Blog" },
  { href: "/case-studies", label: "Case Studies" },
];

function LightningIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

/** Light marketing bar — brand purple only (matches bento-style landing). */
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2 text-base font-bold tracking-tight text-dark" onClick={() => setMenuOpen(false)}>
          <LightningIcon className="h-5 w-5 shrink-0 text-primary" />
          Hello Add
        </Link>
        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="text-sm font-medium text-neutral-600 transition-colors hover:text-primary"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 sm:gap-3">
          <ButtonLink
            href="/login"
            variant="ghost"
            className="px-3 text-sm font-semibold text-neutral-700 hover:text-dark"
            target="_blank"
            rel="noopener noreferrer"
            prefetch={false}
          >
            Login
            <span className="sr-only">(opens in new tab)</span>
          </ButtonLink>
          <ButtonLink
            href="/register"
            variant="primary"
            className="hidden px-4 py-2 text-xs shadow-md shadow-primary/15 sm:inline-flex sm:text-sm"
          >
            <span className="md:hidden">Start free</span>
            <span className="hidden md:inline">Register</span>
          </ButtonLink>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-700 transition-colors hover:bg-neutral-100 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </nav>
      <AnimatePresence initial={false}>
        {menuOpen ? (
          <motion.div
            id="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden border-b border-neutral-200 bg-white md:hidden"
          >
            <ul className="flex flex-col gap-1 px-6 pb-3 pt-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-fog"
                    onClick={() => setMenuOpen(false)}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 border-t border-neutral-100 px-6 pb-5 pt-3">
              <ButtonLink
                href="/login"
                variant="ghost"
                className="w-full justify-center py-2.5 text-sm"
                target="_blank"
                rel="noopener noreferrer"
                prefetch={false}
                onClick={() => setMenuOpen(false)}
              >
                Login
                <span className="sr-only">(opens in new tab)</span>
              </ButtonLink>
              <ButtonLink
                href="/register"
                variant="primary"
                className="w-full justify-center py-2.5 text-sm"
                onClick={() => setMenuOpen(false)}
              >
                Register
              </ButtonLink>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
