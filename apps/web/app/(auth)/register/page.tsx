"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { LightningIcon } from "@/components/auth/LightningIcon";
import { authInputClass, authLabelClass } from "@/components/auth/authStyles";
import type { Plan } from "@/components/auth/planTypes";
import { PlanSelector } from "@/components/auth/PlanSelector";
import { Button } from "@/components/ui/Button";
import { DASHBOARD_API, DASHBOARD_LOGIN_URL } from "@/lib/dashboardApi";
import { dashboardAuthNonJsonMessage, parseDashboardAuthJson } from "@/lib/dashboardAuthResponse";

export default function RegisterPage() {
  const [plan, setPlan] = useState<Plan>("GROWTH");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("invite")?.trim() ?? "";
    setInviteToken(t.length === 64 ? t : null);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const companyName = String(fd.get("company") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirmPassword") ?? "");
    const terms = fd.get("terms") === "on";

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!terms) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }
    if (!inviteToken && !companyName) {
      setError("Company name is required.");
      return;
    }

    setPending(true);
    try {
      const payload = inviteToken
        ? { name, email, password, inviteToken }
        : {
            name,
            email,
            password,
            companyName: companyName || undefined,
            plan,
          };
      const r = await fetch(`${DASHBOARD_API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      type RegJson = { error?: string; requiresEmailVerification?: boolean; email?: string };
      const data = await parseDashboardAuthJson<RegJson>(r);
      if (data === null) {
        setError(dashboardAuthNonJsonMessage(r));
        setPending(false);
        return;
      }
      if (!r.ok) {
        setError(data.error ?? "Registration failed.");
        setPending(false);
        return;
      }
      if (data.requiresEmailVerification && data.email) {
        setVerifyEmail(data.email);
        setPending(false);
        return;
      }
      window.location.assign(`${DASHBOARD_API}/`);
    } catch {
      setError(
        "Could not reach the sign-in service (browser blocked the request or the connection failed). After a deploy, wait for the dashboard to restart; then hard-refresh this page.",
      );
      setPending(false);
    }
  }

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
            <p className="text-sm font-medium text-neutral-500 lg:hidden">Start your free trial</p>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl lg:mt-0">
              {inviteToken ? "Join your team" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {inviteToken
                ? "Use the email your teammate invited. You’ll join their workspace after sign-up."
                : "14-day free trial · No credit card required · Cancel anytime"}
            </p>

            {verifyEmail ? (
              <div className="mt-8 space-y-4 rounded-2xl border border-primary/25 bg-primary/5 p-6">
                <h2 className="text-lg font-bold text-neutral-900">Check your email</h2>
                <p className="text-sm text-neutral-600">
                  We sent a verification link to <strong className="text-neutral-900">{verifyEmail}</strong>. Open it to
                  activate your account — then you can sign in to the dashboard.
                </p>
                <p className="text-xs text-neutral-500">
                  Didn&apos;t get it? Check spam, or resend below (links expire after 48 hours).
                </p>
                {resendMsg ? <p className="text-sm text-primary">{resendMsg}</p> : null}
                <button
                  type="button"
                  disabled={resendBusy}
                  onClick={async () => {
                    setResendBusy(true);
                    setResendMsg("");
                    try {
                      await fetch(`${DASHBOARD_API}/api/auth/resend-verification`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: verifyEmail }),
                      });
                      setResendMsg("If this account still needs verification, we sent a new link.");
                    } catch {
                      setResendMsg("Could not send — try again.");
                    }
                    setResendBusy(false);
                  }}
                  className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  {resendBusy ? "Sending…" : "Resend verification email"}
                </button>
                <p className="pt-2 text-sm text-neutral-600">
                  <Link href={DASHBOARD_LOGIN_URL} className="font-semibold text-primary hover:underline">
                    Go to log in
                  </Link>
                </p>
              </div>
            ) : (
            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
              {!inviteToken && <input type="hidden" name="plan" value={plan} readOnly />}
              <div>
                <label className={authLabelClass} htmlFor="name">
                  Full name
                </label>
                <input id="name" name="name" type="text" required autoComplete="name" className={authInputClass} />
              </div>
              <div>
                <label className={authLabelClass} htmlFor="email">
                  Work email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className={authInputClass}
                />
              </div>
              <div>
                <label className={authLabelClass} htmlFor="company">
                  Company name{inviteToken ? " (optional)" : ""}
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  required={!inviteToken}
                  autoComplete="organization"
                  className={authInputClass}
                />
              </div>
              <div>
                <label className={authLabelClass} htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  className={authInputClass}
                />
              </div>
              <div>
                <label className={authLabelClass} htmlFor="confirmPassword">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  className={authInputClass}
                />
              </div>

              {!inviteToken && <PlanSelector value={plan} onChange={setPlan} />}

              <label className="flex cursor-pointer items-start gap-3 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  name="terms"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary focus:ring-primary"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" className="font-semibold text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="font-semibold text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full py-3 text-base" disabled={pending}>
                {pending ? "Creating…" : inviteToken ? "Join workspace" : "Create Account — Free 14 Days"}
              </Button>
            </form>
            )}

            <p className="mt-8 text-center text-sm text-neutral-600">
              Already have an account?{" "}
              <Link href={DASHBOARD_LOGIN_URL} className="font-bold text-primary hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </AuthSplitLayout>
      </main>
    </div>
  );
}
