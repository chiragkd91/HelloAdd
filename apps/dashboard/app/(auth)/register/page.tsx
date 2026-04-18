"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const PLANS = ["STARTER", "GROWTH", "AGENCY"] as const;

function RegisterForm() {
  const sp = useSearchParams();
  const inviteRaw = sp.get("invite")?.trim() ?? "";
  const inviteToken = inviteRaw.length === 64 ? inviteRaw : "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("GROWTH");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!terms) {
      setError("Please accept the terms to continue.");
      return;
    }
    if (!inviteToken && !companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    setPending(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        password,
        plan,
      };
      if (inviteToken) {
        body.inviteToken = inviteToken;
        if (companyName.trim()) body.companyName = companyName.trim();
      } else {
        body.companyName = companyName.trim();
      }

      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await r.json()) as {
        error?: string;
        detail?: unknown;
        requiresEmailVerification?: boolean;
        email?: string;
      };
      if (!r.ok) {
        setError(data.error ?? "Registration failed");
        setPending(false);
        return;
      }
      if (data.requiresEmailVerification && data.email) {
        setVerifyEmail(data.email);
        setPending(false);
        return;
      }
      window.location.assign("/");
    } catch {
      setError("Network error — try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-neutral-100 lg:flex-row">
      <div className="flex flex-1 flex-col justify-center bg-neutral-900 px-8 py-12 text-white lg:max-w-md lg:px-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Hello Add</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {inviteToken ? "Join your team" : "Start your workspace"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          {inviteToken
            ? "Create a password for this account. You’ll land in the workspace you were invited to."
            : "One account ties users, organizations, and audit-friendly sessions — easy to track who did what."}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-neutral-900">
            {inviteToken ? "Accept invitation" : "Create account"}
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            {inviteToken ? "Use the email your admin invited." : "14-day trial — no card required (demo)."}
          </p>

          {!inviteToken && !verifyEmail && (
            <>
              <a
                href="/api/auth/google/connect"
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign up with Google
              </a>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-xs text-neutral-400">
                  <span className="bg-white px-3">or sign up with email</span>
                </div>
              </div>
            </>
          )}

          {verifyEmail ? (
            <div className="mt-6 space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-5">
              <h3 className="text-lg font-bold text-neutral-900">Check your email</h3>
              <p className="text-sm text-neutral-600">
                We sent a link to <strong className="text-neutral-900">{verifyEmail}</strong>. Open it to verify and
                you&apos;ll be signed in to the dashboard.
              </p>
              {resendMsg ? <p className="text-sm text-primary">{resendMsg}</p> : null}
              <button
                type="button"
                disabled={resendBusy}
                onClick={async () => {
                  setResendBusy(true);
                  setResendMsg("");
                  try {
                    await fetch("/api/auth/resend-verification", {
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
              <p className="text-sm">
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Go to sign in
                </Link>
              </p>
            </div>
          ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-neutral-700">
              Full name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Work email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Company name
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={inviteToken ? "Optional" : "Required"}
                required={!inviteToken}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Password (min 8 characters)
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Confirm password
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            {!inviteToken && (
              <div>
                <p className="text-sm font-medium text-neutral-700">Plan</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {PLANS.map((p) => (
                    <label
                      key={p}
                      className={`flex cursor-pointer flex-col rounded-xl border px-3 py-2 text-center text-xs font-bold ${
                        plan === p ? "border-primary bg-primary/10 text-primary" : "border-neutral-200 text-neutral-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        className="sr-only"
                        checked={plan === p}
                        onChange={() => setPlan(p)}
                      />
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-neutral-400">Stored on org when we wire billing (demo).</p>
              </div>
            )}

            <label className="flex items-start gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-1 rounded border-neutral-300 text-primary focus:ring-primary"
              />
              <span>I agree to Terms of Service and Privacy Policy</span>
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {pending ? "Creating…" : inviteToken ? "Join workspace" : "Create account — free 14 days"}
            </button>
          </form>
          )}

          <p className="mt-6 text-center text-sm text-neutral-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function RegisterFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 text-sm text-neutral-500">
      Loading…
    </div>
  );
}

export default function DashboardRegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
