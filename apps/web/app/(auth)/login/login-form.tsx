"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { authInputClass, authLabelClass } from "@/components/auth/authStyles";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import { Button } from "@/components/ui/Button";
import { DASHBOARD_API, DASHBOARD_REGISTER_URL } from "@/lib/dashboardApi";
import { dashboardAuthNonJsonMessage, parseDashboardAuthJson } from "@/lib/dashboardAuthResponse";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    setPending(true);
    try {
      const r = await fetch(`${DASHBOARD_API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await parseDashboardAuthJson<{ error?: string }>(r);
      if (data === null) {
        setError(dashboardAuthNonJsonMessage(r));
        setPending(false);
        return;
      }
      if (!r.ok) {
        setError(data.error ?? "Sign-in failed.");
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
    <>
      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div>
          <label className={authLabelClass} htmlFor="email">
            Email
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
          <label className={authLabelClass} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={authInputClass}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="remember"
              className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full py-3 text-base" disabled={pending}>
          {pending ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <AuthDivider />
      <GoogleOAuthButton />

      <p className="mt-8 text-center text-sm text-neutral-600">
        Don&apos;t have an account?{" "}
        <Link href={DASHBOARD_REGISTER_URL} className="font-bold text-primary hover:underline">
          Start free trial
        </Link>
      </p>
    </>
  );
}
