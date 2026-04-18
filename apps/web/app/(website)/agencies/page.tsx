import { AgenciesPageContent } from "@/components/agencies/AgenciesPageContent";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Agencies",
  description:
    "White-label reporting, unlimited brands, client portal, and one workflow for every account — Hello Add for performance and full-service agencies.",
  pathname: "/agencies",
  openGraphDescription:
    "One workspace for every client: pacing, AI alerts, branded exports, and APAC-friendly operations.",
});

export default function AgenciesPage() {
  return (
    <>
      <Navbar />
      <main>
        <AgenciesPageContent />
      </main>
      <Footer />
    </>
  );
}
