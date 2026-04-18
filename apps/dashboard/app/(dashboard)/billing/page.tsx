"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function BillingInner() {
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "true";

  return (
    <div className="mx-auto max-w-xl p-6">
      {expired && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your trial has ended. Choose a plan to keep using Hello Add without interruption.
        </div>
      )}
      <h1 className="text-xl font-bold text-neutral-900">Billing</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Manage plans, invoices, and payment methods in Settings.
      </p>
      <Link
        href="/settings?tab=Billing"
        className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-hover"
      >
        Open billing settings
      </Link>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-600">Loading…</div>}>
      <BillingInner />
    </Suspense>
  );
}
