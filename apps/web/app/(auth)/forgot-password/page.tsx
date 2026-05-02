import Link from "next/link";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { DASHBOARD_LOGIN_URL } from "@/lib/dashboardApi";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { pageMetadata } from "@/lib/seo";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = pageMetadata({
  title: "Reset password",
  description:
    "Reset your Hello Add password. We’ll email a link when outbound email is configured on the server.",
  pathname: "/forgot-password",
});

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col">
        <AuthSplitLayout>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl">
              Reset password
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Enter your work email. We&apos;ll process your request when outbound email (e.g. Resend) is configured on
              the server.
            </p>
            <ForgotPasswordForm />
            <p className="mt-8 text-center text-sm text-neutral-600">
              <Link href={DASHBOARD_LOGIN_URL} className="font-semibold text-primary hover:underline">
                ← Back to log in
              </Link>
            </p>
          </div>
        </AuthSplitLayout>
      </main>
      <Footer />
    </div>
  );
}
