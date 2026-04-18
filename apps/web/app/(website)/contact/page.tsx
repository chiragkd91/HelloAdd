import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

const CONTACT_EMAIL = "support@helloadd.online";

export const metadata = pageMetadata({
  title: "Contact",
  description: "Reach the Hello Add team — product questions, partnerships, and beta feedback.",
  pathname: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500 md:text-sm">Company</p>
        <h1 className="text-2xl font-bold tracking-tight text-dark md:text-[1.75rem]">Contact</h1>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-neutral-700">
          <p>
            For product questions, partnership ideas, or beta feedback, email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
            . We read every message; response times are best-effort during private beta.
          </p>
          <p>
            Already trialing Hello Add? Use in-app channels from your workspace when you need help with a specific org or
            integration.
          </p>
        </div>
        <p className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Start free trial
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href="/help" className="font-semibold text-primary hover:underline">
            Help center
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href="/" className="font-semibold text-neutral-600 hover:text-primary">
            Home
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
