import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Create account",
  description:
    "Start your 14-day free trial — no credit card. Unified campaigns, budgets, and AI alerts for your team.",
  pathname: "/register",
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
