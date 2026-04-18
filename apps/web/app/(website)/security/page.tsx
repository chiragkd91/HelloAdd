import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Security",
  description:
    "How Hello Add approaches account security, data handling, and integrations — overview for teams evaluating the platform.",
  pathname: "/security",
});

export default function SecurityPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500 md:text-sm">Trust</p>
        <h1 className="text-2xl font-bold tracking-tight text-dark md:text-[1.75rem]">Security overview</h1>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-neutral-700">
          <p>
            Hello Add is built for marketing and agency teams who connect live ad accounts. We treat credentials and
            workspace data as sensitive by design: access is authenticated, scoped to your organization, and never shared
            across tenants.
          </p>
          <p>
            <strong className="text-dark">Sessions.</strong> Dashboard access uses secure session tokens; passwords and
            integration tokens are not exposed in client-side code or public APIs.
          </p>
          <p>
            <strong className="text-dark">Integrations.</strong> Third-party connections (for example Meta, Google, or
            LinkedIn) use each platform&apos;s approved OAuth or connection flows where applicable. You control which
            accounts are linked.
          </p>
          <p>
            <strong className="text-dark">Reporting issues.</strong> If you discover a vulnerability, contact us at{" "}
            <a href="mailto:security@helloadd.online" className="font-semibold text-primary hover:underline">
              security@helloadd.online
            </a>{" "}
            with enough detail to reproduce. We do not run a public bug bounty yet; we still take reports seriously.
          </p>
          <p className="text-sm text-neutral-500">
            This page is a high-level summary, not a legal agreement. See also our{" "}
            <Link href="/privacy" className="font-semibold text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="font-semibold text-primary hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </div>
        <p className="mt-10 text-sm text-neutral-500">
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
