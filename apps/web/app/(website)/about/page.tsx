import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { DASHBOARD_REGISTER_URL } from "@/lib/dashboardApi";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "About",
  description:
    "Why we built Hello Add: one workspace for paid and organic, built for CMOs and teams in India & APAC.",
  pathname: "/about",
  openGraphDescription: "Sab Ads. Ek Jagah. — our story and how to reach us.",
});

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="bg-sand">
        {/* Editorial hero — warm paper, split layout, no dark hero bar */}
        <section className="relative overflow-hidden border-b border-neutral-300/50">
          <div className="pointer-events-none absolute inset-0 bg-gradient-mesh-purple opacity-70" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-12 md:gap-10 md:py-24 lg:py-28">
            <div className="md:col-span-7">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-olive md:text-xs">Company</p>
              <h1 className="mt-5 text-[2rem] font-bold leading-[1.1] tracking-tight text-dark md:text-5xl lg:text-[3.25rem]">
                We built the workspace we wished we had.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600 md:text-xl">
                Marketing teams juggle Meta, Google, LinkedIn, YouTube, WhatsApp, and a dozen spreadsheets. Hello Add
                exists because we lived that — and wanted one place where spend, pacing, signals, and reports actually
                line up.
              </p>
            </div>
            <div className="flex flex-col justify-center md:col-span-5">
              <div className="relative mx-auto aspect-square w-full max-w-[280px] md:max-w-none">
                <div className="absolute inset-0 rounded-[2.5rem] border border-neutral-400/35 bg-white/55 shadow-sm backdrop-blur-[2px]" />
                <div className="relative flex h-full flex-col items-center justify-center rounded-[2.5rem] p-8 text-center">
                  <p className="font-watermark text-[2.75rem] leading-none text-primary/90 md:text-[3.25rem]">Sab Ads.</p>
                  <p className="mt-2 font-watermark text-[1.65rem] leading-tight text-neutral-600 md:text-[1.85rem]">
                    Ek Jagah.
                  </p>
                  <p className="mt-6 max-w-[13rem] text-xs leading-relaxed text-neutral-500">
                    If a feature doesn&apos;t make every ad surface easier to see in one place, it doesn&apos;t ship.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Two-column story — editorial rhythm */}
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16 lg:gap-20">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-500">Why we started</h2>
              <p className="mt-4 text-base leading-relaxed text-neutral-700 md:text-[1.05rem]">
                Every ad surface you care about should be visible in one workspace — not scattered across exports and
                chat threads. We&apos;re not chasing &quot;another dashboard&quot;; we&apos;re chasing fewer surprises
                between what marketing sees and what finance signs off on.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-500">How we ship</h2>
              <p className="mt-4 text-base leading-relaxed text-neutral-700 md:text-[1.05rem]">
                We&apos;re in <strong className="font-semibold text-dark">private beta</strong>. INR-first defaults,
                IST-aware reporting, Razorpay, and WhatsApp alerts aren&apos;t afterthoughts — they&apos;re how the
                product is designed. We read every piece of feedback that comes through trials and real workspaces.
              </p>
            </div>
          </div>
        </section>

        {/* Pull quote — not a card grid */}
        <section className="border-y border-neutral-300/40 bg-fog/90">
          <div className="mx-auto max-w-4xl px-6 py-12 md:py-14">
            <blockquote className="border-l-[3px] border-primary pl-6 md:pl-8">
              <p className="text-xl font-medium leading-snug text-dark md:text-2xl md:leading-snug">
                One login. Live pacing. Alerts that reach you on WhatsApp. Reports your board can read without a
                decoder ring.
              </p>
            </blockquote>
          </div>
        </section>

        {/* Principles — numbered row, dividers, no shadow cards */}
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <h2 className="text-center font-mono text-[11px] uppercase tracking-[0.28em] text-olive">What we optimize for</h2>
          <div className="mt-10 grid divide-y divide-neutral-300/80 border-y border-neutral-300/80 md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="px-4 py-8 text-center md:px-6 md:py-10">
              <p className="font-mono text-3xl font-bold tabular-nums text-primary/80">01</p>
              <p className="mt-3 text-sm font-semibold text-dark">Clarity over noise</p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Fewer tabs, fewer exports — the same numbers from campaign to boardroom.
              </p>
            </div>
            <div className="px-4 py-8 text-center md:px-6 md:py-10">
              <p className="font-mono text-3xl font-bold tabular-nums text-primary/80">02</p>
              <p className="mt-3 text-sm font-semibold text-dark">India &amp; APAC-first</p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Time zones, currency, and channels your team actually uses — baked in, not localized later.
              </p>
            </div>
            <div className="px-4 py-8 text-center md:px-6 md:py-10">
              <p className="font-mono text-3xl font-bold tabular-nums text-primary/80">03</p>
              <p className="mt-3 text-sm font-semibold text-dark">Ship fast, listen faster</p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Beta means your feedback reshapes the roadmap — not a ticket in a black hole.
              </p>
            </div>
          </div>
        </section>

        {/* Soft CTA strip — different from gradient CTAs elsewhere */}
        <section className="border-t border-neutral-300/50 bg-warm-light">
          <div className="mx-auto max-w-3xl px-6 py-10 text-center md:py-12">
            <p className="text-base text-neutral-700 md:text-lg">
              Want to talk? Reach us through your Hello Add workspace, or start from the{" "}
              <Link href={DASHBOARD_REGISTER_URL} className="font-semibold text-primary underline decoration-primary/35 underline-offset-4 hover:decoration-primary">
                trial
              </Link>{" "}
              and break things.
            </p>
          </div>
        </section>

        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-12 text-sm">
          <Link href="/changelog" className="font-medium text-neutral-600 transition hover:text-primary">
            Changelog
          </Link>
          <span className="hidden text-neutral-300 sm:inline" aria-hidden>
            ·
          </span>
          <Link href="/features" className="font-medium text-neutral-600 transition hover:text-primary">
            Features
          </Link>
          <span className="hidden text-neutral-300 sm:inline" aria-hidden>
            ·
          </span>
          <Link href="/" className="font-medium text-neutral-600 transition hover:text-primary">
            Home
          </Link>
        </nav>
      </main>
      <Footer />
    </>
  );
}
