import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Careers",
  description:
    "Build unified ad ops for India and APAC — Hello Add is hiring selectively during private beta.",
  pathname: "/careers",
});

export default function CareersPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500 md:text-sm">Company</p>
        <h1 className="text-2xl font-bold tracking-tight text-dark md:text-[1.75rem]">Careers</h1>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-neutral-700">
          <p>
            We&apos;re a small team building Hello Add in private beta. We hire slowly and care deeply about craft,
            ownership, and empathy for marketers drowning in tabs.
          </p>
          <p>
            There are no open public listings right now. When we post roles, we&apos;ll link them here and share on our
            usual channels.
          </p>
          <p>
            Interested in working with us anyway? Send a note to{" "}
            <a href="mailto:careers@helloadd.online" className="font-semibold text-primary hover:underline">
              careers@helloadd.online
            </a>{" "}
            with what you&apos;d like to build — we read everything.
          </p>
        </div>
        <p className="mt-10 text-sm text-neutral-500">
          <Link href="/about" className="font-semibold text-primary hover:underline">
            About
          </Link>
          {" · "}
          <Link href="/contact" className="font-semibold text-primary hover:underline">
            Contact
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
