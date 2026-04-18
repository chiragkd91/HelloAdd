import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Blog",
  description:
    "Notes from the Hello Add team: how we ship, what we learn from beta users, and practical ideas for unified ad ops.",
  pathname: "/blog",
  openGraphDescription: "Stories and updates for growth teams running paid and organic in one place.",
});

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500 md:text-sm">
          Resources
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 md:text-[1.75rem]">Blog</h1>
        <p className="mt-4 text-base leading-relaxed text-neutral-600">
          We&apos;re writing short, useful posts on unified campaigns, reporting, and what we&apos;re learning from
          teams in the beta. The first articles are on the way; for ship-by-ship changes, see the{" "}
          <Link href="/changelog" className="font-semibold text-primary hover:underline">
            changelog
          </Link>
          .
        </p>
      </main>
      <Footer />
    </>
  );
}
