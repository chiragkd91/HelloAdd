import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description: "Terms of use for the Hello Add platform and trial.",
  pathname: "/terms",
});

const EFFECTIVE_DATE = "18 April 2026";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500 md:text-sm">Legal</p>
        <h1 className="text-2xl font-bold tracking-tight text-dark md:text-[1.75rem]">Terms of Service</h1>
        <p className="mt-2 text-sm text-neutral-500">Effective date: {EFFECTIVE_DATE}</p>
        <p className="mt-6 text-sm leading-relaxed text-neutral-600">
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of Hello Add (the
          &quot;Service&quot;) operated by us (&quot;Hello Add,&quot; &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;). By creating an account, starting a trial, or using the Service, you agree to these
          Terms. If you do not agree, do not use the Service.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-neutral-600">
          Our{" "}
          <Link href="/privacy" className="font-semibold text-primary hover:underline">
            Privacy Policy
          </Link>{" "}
          explains how we handle personal data and is incorporated by reference.
        </p>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">1. The Service</h2>
          <p>
            Hello Add provides a cloud-based workspace for marketing teams and agencies to connect advertising and
            related accounts, view unified reporting, manage workflows, and use optional features such as alerts and
            AI-assisted tools. We may add, change, or discontinue features; we will use reasonable efforts to avoid
            material disruption where we can.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">2. Eligibility and accounts</h2>
          <p>
            You must be legally able to enter a binding contract in your jurisdiction. You are responsible for all
            activity under your account and for maintaining the confidentiality of your credentials. You must provide
            accurate registration information and keep it up to date. If you use the Service on behalf of a company or
            organization, you represent that you have authority to bind that entity to these Terms.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">3. Trials, plans, and billing</h2>
          <p>
            We may offer a free trial or promotional access. When a trial ends, continued use may require a paid
            subscription. Fees, billing cycles, and taxes are described at checkout or in your workspace. Payments may
            be processed by third-party providers (for example, Razorpay). You authorize us and our payment partners to
            charge your chosen payment method for applicable fees. Unless stated otherwise, fees are non-refundable to
            the extent permitted by law. You may cancel according to the options shown in the product; cancellation does
            not remove your obligation to pay amounts already due.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Violate applicable laws or third-party rights.</li>
            <li>Probe, scan, or test the vulnerability of the Service without authorization, or bypass security.</li>
            <li>Upload or transmit malware, spam, or unlawful content.</li>
            <li>Attempt to access accounts or data that are not yours, or interfere with other users&apos; use.</li>
            <li>Reverse engineer or attempt to extract source code except where applicable law allows.</li>
            <li>Use the Service to build a competing product by systematic scraping or misuse of non-public APIs.</li>
          </ul>
          <p>
            We may suspend or terminate access if we reasonably believe you have breached these Terms or pose a risk to
            the Service or other users.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">5. Third-party platforms and your content</h2>
          <p>
            The Service may allow you to connect third-party advertising, analytics, or communication platforms (such as
            Meta, Google, LinkedIn, or messaging providers). Those services are governed by their own terms and privacy
            policies. You are solely responsible for your relationships with those providers and for the data you choose
            to connect or share. We do not control third-party platforms and are not liable for their availability,
            actions, or charges.
          </p>
          <p>
            You retain ownership of content and data you submit (&quot;Customer Data&quot;). You grant us a worldwide,
            non-exclusive license to host, process, transmit, and display Customer Data only as needed to provide and
            improve the Service, secure it, and comply with law. You represent that you have all rights necessary to
            grant this license.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">6. AI-assisted features</h2>
          <p>
            Optional features may use artificial intelligence or automated analysis. Outputs may be inaccurate or
            incomplete. You remain responsible for decisions made in your advertising accounts and for reviewing AI
            suggestions before relying on them. AI features are provided &quot;as is&quot; without warranties as to
            accuracy or fitness for a particular purpose beyond what the law requires.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">7. Intellectual property</h2>
          <p>
            The Service, including software, branding, and documentation, is owned by us or our licensors. Except for the
            limited rights expressly granted in these Terms, no rights are transferred to you. You may not use our
            trademarks without prior written consent.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">8. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM EXTENT PERMITTED BY
            LAW, WE DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING MERCHANTABILITY, FITNESS
            FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR
            ERROR-FREE, OR THAT DEFECTS WILL BE CORRECTED.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">9. Limitation of liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL HELLO ADD, ITS AFFILIATES, OR THEIR RESPECTIVE
            DIRECTORS, EMPLOYEES, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
            PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR
            RELATED TO THESE TERMS OR THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p>
            OUR TOTAL LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE IN ANY TWELVE
            (12) MONTH PERIOD IS LIMITED TO THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THAT PERIOD,
            OR (B) INR 5,000, EXCEPT WHERE LIABILITY CANNOT BE LIMITED UNDER APPLICABLE LAW (SUCH AS FOR DEATH OR PERSONAL
            INJURY CAUSED BY NEGLIGENCE WHERE REQUIRED).
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">10. Indemnity</h2>
          <p>
            You will defend, indemnify, and hold harmless Hello Add and its affiliates from any claims, damages,
            losses, and expenses (including reasonable legal fees) arising from your Customer Data, your use of the
            Service in breach of these Terms, or your violation of law or third-party rights.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">11. Termination</h2>
          <p>
            You may stop using the Service at any time. We may suspend or terminate access if you materially breach
            these Terms, if we are required to do so by law, or if we discontinue the Service with reasonable notice
            where practicable. Provisions that by their nature should survive (including intellectual property,
            disclaimers, limitation of liability, and indemnity) will survive termination.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">12. Changes</h2>
          <p>
            We may modify these Terms from time to time. We will post the updated Terms on this page and update the
            effective date. If changes are material, we will provide notice as required by law or through the Service.
            Continued use after the effective date of changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">13. Governing law and disputes</h2>
          <p>
            These Terms are governed by the laws of India, without regard to conflict-of-law principles. Courts located
            in India shall have exclusive jurisdiction over disputes arising from these Terms or the Service, subject to
            any mandatory rights you may have under local consumer protection laws.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-dark">14. Contact</h2>
          <p>
            For questions about these Terms, contact us through the support or contact options provided in your Hello Add
            workspace or on our website.
          </p>
        </section>

        <p className="mt-10 text-sm text-neutral-500">
          <Link href="/privacy" className="font-semibold text-primary hover:underline">
            Privacy Policy
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
