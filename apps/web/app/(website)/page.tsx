import { homeMetadata } from "@/lib/seo";
import { CTASection } from "@/components/landing/CTASection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { PainSolutionSection } from "@/components/landing/PainSolutionSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { UnifiedCalendarSection } from "@/components/landing/UnifiedCalendarSection";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

/**
 * Marketing landing (Part 4): Navbar → Hero → Stats → Pain/Solution → Features (6) →
 * Integrations grid → Pricing (3 tiers + toggle) → Testimonials → CTA → Footer.
 * Motion: Framer Motion in section components; styling: Tailwind + design tokens.
 */
export const metadata = homeMetadata;

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <PainSolutionSection />
        <FeaturesSection />
        <UnifiedCalendarSection />
        <IntegrationsSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
