import Link from "next/link";
import { LightningIcon } from "@/components/auth/LightningIcon";

const highlights = [
  "One dashboard for Meta, Google, LinkedIn & more",
  "AI alerts for overspend and broken campaigns",
  "CEO-ready reports in one click",
];

export function AuthBrandingPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-hero px-10 py-12 text-white lg:flex lg:px-14 lg:py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_20%,rgba(22,163,74,0.2),transparent)]"
        aria-hidden
      />
      <div className="relative">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg outline-offset-4 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <LightningIcon className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold tracking-tight">Hello Add</span>
        </Link>
        <p className="mt-6 text-lg font-medium text-neutral-300">Sab Ads. Ek Jagah.</p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-400">
          The CMO command center for teams in India & APAC — unify spend, catch errors early, and
          ship reports your leadership actually reads.
        </p>
        <ul className="mt-10 space-y-4">
          {highlights.map((line) => (
            <li key={line} className="flex gap-3 text-sm text-neutral-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </div>
      <p className="relative text-xs text-neutral-500">© {new Date().getFullYear()} Hello Add</p>
    </div>
  );
}
