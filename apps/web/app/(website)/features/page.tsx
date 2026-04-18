import { FeaturesHero } from "@/components/features/FeaturesHero";
import { FeaturesPageContent } from "@/components/features/FeaturesPageContent";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Features",
  description:
    "Paid ads dashboard, organic scheduling, AI guardrails, WhatsApp alerts, unified calendar, reports, and agency white-label — all in one CMO workspace.",
  pathname: "/features",
  openGraphDescription:
    "Everything you get: unified campaigns, budgets, AI errors, and reporting for Indian & APAC teams.",
});

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main>
        <FeaturesHero />
        <FeaturesPageContent />
      </main>
      <Footer />
    </>
  );
}
