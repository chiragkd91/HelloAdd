import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description: "How Hello Add handles your data, accounts, and integrations.",
  pathname: "/privacy",
});

const EFFECTIVE_DATE = "18 April 2026";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500 md:text-sm">Legal</p>
        <h1 className="text-2xl font-bold tracking-tight text-dark md:text-[1.75rem]">Privacy Policy</h1>
        <p className="mt-2 text-sm text-neutral-500">Effective date: {EFFECTIVE_DATE}</p>
        <p className="mt-6 text-sm leading-relaxed text-neutral-600">
          This Privacy Policy describes how Hello Add (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects,
          uses, stores, and shares information when you use our websites, applications, and related services
          (collectively, the &quot;Service&quot;). By using the Service, you agree to this policy alongside our{" "}
          <Link href="/terms" className="font-semibold text-primary hover:underline">
            Terms of Service
          </Link>
          .
        </p>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">1. Who this applies to</h2>
          <p>
            This policy applies to visitors to our marketing site, registered users, and organization members who access
            the Hello Add workspace. If you are invited to an organization, your organization may have its own policies;
            this document describes how we process information as the Service provider.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">2. Information we collect</h2>
          <p className="font-medium text-dark">Account and profile</p>
          <p>
            We collect information you provide when you register or update your profile, such as name, email address,
            organization name, and role. We may collect authentication data needed to secure your session (for example,
            session tokens stored in cookies or similar technologies).
          </p>
          <p className="font-medium text-dark">Workspace and usage</p>
          <p>
            We collect information about how you use the Service, including actions you take in the product, settings
            you configure, and approximate technical data such as browser type, device type, and timestamps. We use
            this to operate, secure, and improve the Service.
          </p>
          <p className="font-medium text-dark">Integrations and advertising platforms</p>
          <p>
            When you connect third-party accounts (for example, advertising or analytics platforms), we receive and
            store credentials, tokens, or identifiers that those systems provide so we can sync data and display it in
            your workspace. The categories of data depend on what you authorize and what each platform shares with us.
          </p>
          <p className="font-medium text-dark">Communications</p>
          <p>
            If you contact us for support or subscribe to updates, we process the content of those messages and related
            metadata (such as delivery status). We may send transactional emails or in-product notices about security,
            billing, or important changes.
          </p>
          <p className="font-medium text-dark">Payments</p>
          <p>
            Payments are processed by third-party payment providers. We do not store full payment card numbers on our
            servers; our providers process card data according to their privacy policies and industry standards. We may
            receive limited billing metadata (such as subscription status and last four digits where applicable).
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">3. How we use information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Provide, maintain, and improve the Service and its features.</li>
            <li>Authenticate users, enforce organization boundaries, and protect accounts.</li>
            <li>Sync and display data from connected platforms you authorize.</li>
            <li>Send service-related communications, security alerts, and (where permitted) product updates.</li>
            <li>Analyze usage in aggregate to understand performance and plan improvements.</li>
            <li>Comply with legal obligations and respond to lawful requests.</li>
            <li>Develop optional AI-assisted features; inputs and outputs may be processed to operate those features as
              described in product disclosures.</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">4. Legal bases (where applicable)</h2>
          <p>
            Depending on your location, we may rely on different legal bases to process personal data, such as
            performance of a contract, legitimate interests in operating and securing the Service (balanced against your
            rights), consent where we ask for it, or compliance with legal obligations. Where consent is required for
            specific processing, you may withdraw it as described in the Service or by contacting us.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">5. Sharing and subprocessors</h2>
          <p>
            We do not sell your personal information. We share information only as needed to provide the Service, with
            service providers who process data on our instructions (such as hosting, email delivery, analytics, payment
            processing, or security), when required by law, or to protect the rights, safety, and integrity of users and
            the Service. We may share information in connection with a merger, acquisition, or sale of assets, subject
            to appropriate confidentiality and notice requirements.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">6. International transfers</h2>
          <p>
            We may process and store information in India and other countries where we or our providers operate. Where
            we transfer personal data across borders, we implement appropriate safeguards as required by applicable law.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">7. Retention</h2>
          <p>
            We retain information for as long as your account is active and for a reasonable period afterward to resolve
            disputes, enforce agreements, and comply with legal requirements. Backup and log retention periods may vary
            by system. You may request deletion of your account subject to legal and contractual exceptions.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">8. Security</h2>
          <p>
            We implement technical and organizational measures designed to protect information against unauthorized
            access, loss, or alteration. No method of transmission or storage is completely secure; we encourage you to
            use strong passwords and protect your devices.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">9. Your choices and rights</h2>
          <p>
            Depending on applicable law, you may have rights to access, correct, delete, or export personal data, or to
            object to or restrict certain processing. You may also have the right to lodge a complaint with a data
            protection authority. To exercise rights, contact us using the channels below. We will respond in line with
            applicable timelines.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">10. Children</h2>
          <p>
            The Service is not directed at children under 16 (or the age required in your jurisdiction). We do not
            knowingly collect personal information from children. If you believe we have collected such information,
            contact us and we will take appropriate steps to delete it.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">11. Third-party links and services</h2>
          <p>
            The Service may link to third-party websites or rely on integrations you enable. Their privacy practices are
            governed by their own policies. We encourage you to review those policies before connecting accounts or
            sharing data.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">12. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the revised policy on this page and
            update the effective date. If changes are material, we will provide additional notice as appropriate.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">13. Contact</h2>
          <p>
            For privacy-related requests or questions, contact us through the support or contact options provided in your
            Hello Add workspace or on our website.
          </p>
        </section>

        <p className="mt-10 text-sm text-neutral-500">
          <Link href="/terms" className="font-semibold text-primary hover:underline">
            Terms of Service
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
