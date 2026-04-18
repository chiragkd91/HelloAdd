import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Help center",
  description: "Get started with Hello Add — accounts, integrations, and where to ask for help during beta.",
  pathname: "/help",
});

export default function HelpPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500 md:text-sm">Resources</p>
        <h1 className="text-2xl font-bold tracking-tight text-dark md:text-[1.75rem]">Help center</h1>
        <p className="mt-4 text-base leading-relaxed text-neutral-600">
          We&apos;re growing this library as beta users ask questions. For now, start here — then reach out if you&apos;re
          stuck.
        </p>
        <ul className="mt-8 space-y-4 text-base leading-relaxed text-neutral-700">
          <li>
            <strong className="text-dark">Getting started</strong> — Create an account, join or create an organization,
            and connect the ad platforms you use. See{" "}
            <Link href="/features" className="font-semibold text-primary hover:underline">
              Features
            </Link>{" "}
            for what&apos;s in the product today.
          </li>
          <li>
            <strong className="text-dark">Agencies</strong> — Multi-client workflows and white-label context are outlined
            on{" "}
            <Link href="/agencies" className="font-semibold text-primary hover:underline">
              Agencies
            </Link>
            .
          </li>
          <li>
            <strong className="text-dark">Billing</strong> — Plans and trials are on{" "}
            <Link href="/pricing" className="font-semibold text-primary hover:underline">
              Pricing
            </Link>
            .
          </li>
          <li>
            <strong className="text-dark">Still stuck?</strong> Email{" "}
            <a href="mailto:support@helloadd.online" className="font-semibold text-primary hover:underline">
              support@helloadd.online
            </a>{" "}
            or use{" "}
            <Link href="/contact" className="font-semibold text-primary hover:underline">
              Contact
            </Link>
            .
          </li>
        </ul>
        <p className="mt-10 text-sm text-neutral-500">
          <Link href="/changelog" className="font-semibold text-primary hover:underline">
            Changelog
          </Link>
          {" · "}
          <Link href="/" className="font-semibold text-primary hover:underline">
            Home
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
