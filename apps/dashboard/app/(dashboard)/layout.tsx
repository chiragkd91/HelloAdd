import { DashboardShell } from "@/components/layout/DashboardShell";
import { getSessionOrgContext } from "@/lib/server/orgContext";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const ONBOARDING_EXCEPTIONS = ["/settings", "/integrations", "/billing"];

function onboardingException(pathname: string): boolean {
  return ONBOARDING_EXCEPTIONS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const ctx = await getSessionOrgContext();

  if (pathname.startsWith("/onboarding")) {
    if (ctx?.onboardingComplete !== false) {
      redirect("/");
    }
    return <div className="min-h-[100dvh] bg-neutral-100">{children}</div>;
  }

  if (ctx && ctx.onboardingComplete === false && !onboardingException(pathname)) {
    redirect("/onboarding");
  }

  if (ctx && ctx.plan === "TRIAL" && ctx.trialEndsAt && ctx.trialEndsAt.getTime() < Date.now()) {
    const allow =
      pathname.startsWith("/billing") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/onboarding");
    if (!allow) {
      redirect("/billing?expired=true");
    }
  }

  return <DashboardShell>{children}</DashboardShell>;
}
