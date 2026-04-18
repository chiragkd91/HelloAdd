import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Changelog",
  description: "What shipped recently: product updates, fixes, and improvements to Hello Add.",
  pathname: "/changelog",
  openGraphDescription: "Recent releases and updates.",
});

/** Edit this list as you ship — newest first */
const ENTRIES: { date: string; title: string; body: string }[] = [
  {
    date: "2026-04-18",
    title: "Marketing site & dashboard preview",
    body: "Bento-style landing, honest beta stats strip, footer watermark, and an interactive dashboard mockup (slides + nav hover details). Brand purple unified across web + app.",
  },
  {
    date: "2026-04-01",
    title: "Private beta access",
    body: "Invite-by-invite onboarding, trial flow, and core integrations: Meta, Google, LinkedIn, YouTube, WhatsApp alerts.",
  },
];

export default function ChangelogPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500 md:text-sm">Product</p>
        <h1 className="text-2xl font-bold tracking-tight text-dark md:text-[1.75rem]">Changelog</h1>
        <p className="mt-4 text-base text-neutral-600">
          High-level notes on what changed. For support, use your workspace settings or contact listed in{" "}
          <Link href="/about" className="font-semibold text-primary hover:underline">
            About
          </Link>
          .
        </p>
        <ol className="mt-12 space-y-10 border-l-2 border-sand pl-6">
          {ENTRIES.map((e) => (
            <li key={e.date + e.title} className="relative">
              <span className="absolute -left-[calc(0.5rem+2px)] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-primary" />
              <time className="text-xs font-semibold uppercase tracking-wide text-neutral-500" dateTime={e.date}>
                {e.date}
              </time>
              <h2 className="mt-1 text-lg font-bold text-dark">{e.title}</h2>
              <p className="mt-2 text-base leading-relaxed text-neutral-700">{e.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-12 text-sm text-neutral-500">
          <Link href="/" className="font-semibold text-primary hover:underline">
            ← Back to home
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
