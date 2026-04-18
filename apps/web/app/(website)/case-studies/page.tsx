import { CaseStudiesContent } from "@/components/case-studies/CaseStudiesContent";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Case studies",
  description:
    "How CMOs, growth teams, and agencies use Hello Add to unify Meta, Google, and LinkedIn — real challenges, solutions, and results.",
  pathname: "/case-studies",
  openGraphDescription:
    "Customer stories: time saved, budget control, and AI-powered campaign alerts for teams in India and APAC.",
});

export default function CaseStudiesPage() {
  return (
    <>
      <Navbar />
      <main>
        <CaseStudiesContent />
      </main>
      <Footer />
    </>
  );
}
