"use client";

import { useState } from "react";
import { authInputClass, authLabelClass } from "@/components/auth/authStyles";
import { Button } from "@/components/ui/Button";
import { DASHBOARD_API } from "@/lib/dashboardApi";

export function ForgotPasswordForm() {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setPending(true);
    try {
      const r = await fetch(`${DASHBOARD_API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = (await r.json()) as { error?: string; message?: string };
      if (!r.ok) {
        setError(data.error ?? "Request failed.");
        setPending(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error — check that the dashboard is running and try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm text-neutral-800">
        <p className="font-semibold text-neutral-900">Request received</p>
        <p className="mt-2 text-neutral-700">
          If an account exists for that email, you will receive reset instructions when outbound email is configured on
          the server.
        </p>
      </div>
    );
  }

  return (
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
          className={authInputClass}
        />
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full py-3" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
