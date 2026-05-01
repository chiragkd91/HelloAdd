"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { DEFAULT_PUBLIC_MARKETING_ORIGIN } from "@helloadd/public-origins";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const marketingSiteUrl =
  typeof process.env.NEXT_PUBLIC_MARKETING_URL === "string" && process.env.NEXT_PUBLIC_MARKETING_URL.length > 0
    ? process.env.NEXT_PUBLIC_MARKETING_URL
    : DEFAULT_PUBLIC_MARKETING_ORIGIN;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const fromParam = searchParams.get("from");
  const inviteTok = searchParams.get("invite");

  const googleErrorMessages: Record<string, string> = {
    google_denied: "Google sign-in was cancelled.",
    google_invalid: "Invalid sign-in attempt. Please try again.",
    google_failed: "Google sign-in failed. Please try again.",
    google_email_taken: "This email is registered with a password. Please sign in below.",
    google_not_configured: "Google sign-in is not available right now.",
    verify_invalid: "That verification link is invalid. Request a new one from the sign-up page.",
    verify_expired: "That verification link has expired. Request a new one from the sign-up page.",
    verify_failed: "Could not verify your email. Try again or contact support.",
  };
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string>(
    errorParam ? (googleErrorMessages[errorParam] ?? "Something went wrong. Please try again.") : ""
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(data.error ?? "Login failed");
        setPending(false);
        return;
      }
      await refresh();
      const dest = searchParams.get("from");
      const safe =
        dest && dest.startsWith("/") && !dest.startsWith("//") ? dest : "/";
      if (safe.startsWith("/accept-invite")) {
        window.location.assign(safe);
        return;
      }
      router.push(safe);
      router.refresh();
    } catch {
      setError("Network error — try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-neutral-100 lg:flex-row">
      <div className="flex flex-1 flex-col justify-center bg-neutral-900 px-8 py-12 text-white lg:max-w-md lg:px-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Hello Add</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Smarter ads, one workspace</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          Sign in to track campaigns, budgets, and AI-detected issues — all tied to your account.
        </p>
        <ul className="mt-8 space-y-2 text-sm text-neutral-300">
          <li>· Unified Meta, Google, LinkedIn</li>
          <li>· Role-based access for your team</li>
          <li>· Session secured with httpOnly cookie</li>
        </ul>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <p className="text-center">
            <a
              href={marketingSiteUrl}
              className="text-sm font-semibold text-primary hover:underline"
            >
              ← Visit public website (home, pricing, sign up)
            </a>
          </p>
          <h2 className="mt-5 text-xl font-bold text-neutral-900">Dashboard sign in</h2>
          <p className="mt-1 text-sm text-neutral-600">Use your work email and password.</p>

          <a
            href={`/api/auth/google/connect${fromParam ? `?from=${encodeURIComponent(fromParam)}` : ""}`}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </a>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs text-neutral-400">
              <span className="bg-white px-3">or continue with email</span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-neutral-700">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-neutral-300 text-primary focus:ring-primary"
                />
                Remember me
              </label>
              <span className="text-sm text-neutral-400">Forgot password? (soon)</span>
            </div>

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
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-600">
            No account?{" "}
            <Link
              href={inviteTok ? `/register?invite=${encodeURIComponent(inviteTok)}` : "/register"}
              className="font-semibold text-primary hover:underline"
            >
              Create one
            </Link>
          </p>
          <p className="mt-4 text-center text-xs text-neutral-400">
            Demo: demo@helloadd.com / password123 (after{" "}
            <code className="rounded bg-neutral-100 px-1">npm run db:seed</code>)
          </p>
        </div>
      </div>
    </div>
  );
}
