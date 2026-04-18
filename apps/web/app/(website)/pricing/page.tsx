import { PricingPageContent } from "@/components/pricing/PricingPageContent";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Pricing",
  description:
    "Simple, transparent pricing for Hello Add. Starter, Growth, and Agency plans with a 14-day free trial.",
  pathname: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main>
        <PricingPageContent />
      </main>
      <Footer />
    </>
  );
}
