import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "API",
  description:
    "Hello Add API access for Agency plans — automation, webhooks, and integrations. Reference documentation is expanding with beta.",
  pathname: "/docs/api",
});

export default function ApiDocsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500 md:text-sm">Developers</p>
        <h1 className="text-2xl font-bold tracking-tight text-dark md:text-[1.75rem]">API</h1>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-neutral-700">
          <p>
            Programmatic access is available on the <strong className="text-dark">Agency</strong> plan for teams who
            want to connect CRMs, internal tools, or custom workflows to Hello Add.
          </p>
          <p>
            Full OpenAPI-style reference docs, example requests, and versioning policy are in active development. If
            you&apos;re an Agency customer and need access now, email{" "}
            <a href="mailto:support@helloadd.online" className="font-semibold text-primary hover:underline">
              support@helloadd.online
            </a>{" "}
            with your use case — we&apos;ll share what&apos;s available in your environment.
          </p>
        </div>
        <p className="mt-10 text-sm text-neutral-500">
          <Link href="/pricing" className="font-semibold text-primary hover:underline">
            Pricing
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
