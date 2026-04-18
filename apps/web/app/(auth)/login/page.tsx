import Link from "next/link";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { LightningIcon } from "@/components/auth/LightningIcon";
import { pageMetadata } from "@/lib/seo";
import { LoginForm } from "./login-form";

/** Standalone sign-in: no marketing Navbar/Footer — opens cleanly in its own tab */
export const metadata = pageMetadata({
  title: "Log in",
  description: "Sign in to Hello Add — unified campaigns, budgets, and alerts in one workspace.",
  pathname: "/login",
});

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-100">
      <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2 text-base font-bold tracking-tight text-neutral-900">
          <LightningIcon className="h-6 w-6 shrink-0 text-primary" />
          Hello Add
        </Link>
        <Link href="/" className="text-sm font-semibold text-primary hover:underline">
          ← Website
        </Link>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <AuthSplitLayout standalone>
          <div>
            <p className="text-sm font-medium text-neutral-500 lg:hidden">Sign in to your workspace</p>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl lg:mt-0">Log in</h1>
            <p className="mt-2 text-sm text-neutral-600">{`Welcome back — manage every campaign from one place.`}</p>

            <LoginForm />
          </div>
        </AuthSplitLayout>
      </main>
    </div>
  );
}
