"use client";

import { Button } from "@/components/ui/Button";
import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type BillingStatus = {
  plan: string;
  trialEndsAt: string | null;
  subscriptionId: string | null;
  nextBillingDate: string | null;
  billingInvoices: { billedAt: string; amountInr: number; plan: string; status: string }[];
};

const PLANS = [
  {
    id: "STARTER" as const,
    name: "Starter",
    blurb: "Core dashboards & AI usage for small teams.",
    price: "₹4,999",
  },
  {
    id: "GROWTH" as const,
    name: "Growth",
    blurb: "Higher limits, reports, and integrations.",
    price: "₹24,999",
  },
  {
    id: "AGENCY" as const,
    name: "Agency",
    blurb: "Multi-client workspaces & priority support.",
    price: "Custom",
  },
];

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      subscription_id: string;
      name: string;
      description: string;
      handler: (response: unknown) => void;
      modal?: { ondismiss?: () => void };
    }) => { open: () => void };
  }
}

export function BillingSettings({ orgRole }: { orgRole: string | undefined }) {
  const router = useRouter();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<(typeof PLANS)[number]["id"] | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetch("/api/billing/status", { credentials: "include", cache: "no-store" });
      if (!r.ok) {
        setStatus(null);
        setLoadError("Could not load billing status.");
        return;
      }
      const data = (await r.json()) as BillingStatus;
      setStatus(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = "razorpay-checkout-js";
    if (document.getElementById(id)) {
      setScriptReady(true);
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => setScriptReady(true);
    document.body.appendChild(s);
  }, []);

  const canManage = orgRole === "OWNER" || orgRole === "ADMIN";

  async function startCheckout(plan: (typeof PLANS)[number]["id"]) {
    if (!canManage) {
      toast.error("Only owners and admins can change plans.");
      return;
    }
    if (!scriptReady || !window.Razorpay) {
      toast.error("Payment script still loading — try again.");
      return;
    }
    setCheckoutPlan(plan);
    try {
      const r = await fetch("/api/billing/create-subscription", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Could not start checkout");
        return;
      }
      const data = (await r.json()) as { subscriptionId: string; key: string };
      const rz = new window.Razorpay!({
        key: data.key,
        subscription_id: data.subscriptionId,
        name: "Hello Add",
        description: `${plan} plan`,
        handler: () => {
          toast.success("Subscription started — updating account…");
          void load();
          router.refresh();
        },
        modal: {
          ondismiss: () => setCheckoutPlan(null),
        },
      });
      rz.open();
    } catch {
      toast.error("Checkout failed");
    } finally {
      setCheckoutPlan(null);
    }
  }

  async function cancelSub() {
    setShowCancel(false);
    try {
      const r = await fetch("/api/billing/cancel-subscription", {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) {
        toast.error("Could not cancel subscription");
        return;
      }
      toast.success("Subscription cancelled");
      void load();
      router.refresh();
    } catch {
      toast.error("Network error");
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-600">Loading billing…</p>;
  }
  if (loadError || !status) {
    return <p className="text-sm text-amber-800">{loadError ?? "Billing unavailable."}</p>;
  }

  const trialEnd = status.trialEndsAt ? new Date(status.trialEndsAt) : null;
  const trialDaysLeft =
    status.plan === "TRIAL" && trialEnd
      ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86_400_000))
      : null;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-bold text-neutral-900">Billing</h2>
      <p className="mt-1 text-xs text-neutral-600">
        Razorpay subscription · INR · renews monthly unless cancelled.
      </p>

      <div className="mt-4 rounded-xl bg-neutral-50 p-4">
        <p className="text-sm text-neutral-600">
          Current plan:{" "}
          <strong className="text-neutral-900">{status.plan}</strong>
          {trialDaysLeft != null && (
            <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left in trial
            </span>
          )}
        </p>
        {status.nextBillingDate && (
          <p className="mt-1 text-sm text-neutral-600">
            Next billing:{" "}
            <strong>{new Date(status.nextBillingDate).toLocaleDateString("en-IN")}</strong>
          </p>
        )}
        {status.subscriptionId && (
            <p className="mt-1 font-mono text-xs text-neutral-600">Sub: {status.subscriptionId}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {canManage && status.subscriptionId && (
            <Button type="button" variant="secondary" onClick={() => setShowCancel(true)}>
              Cancel subscription
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xs font-bold uppercase text-neutral-600">Upgrade plan</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className="flex flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-bold text-neutral-900">{p.name}</p>
              <p className="mt-1 text-xs text-neutral-600">{p.blurb}</p>
              <p className="mt-3 text-lg font-bold text-neutral-900">{p.price}</p>
              <button
                type="button"
                disabled={!canManage || checkoutPlan !== null || !scriptReady}
                onClick={() => void startCheckout(p.id)}
                className={`${buttonVariantStyles.primary} mt-4 w-full justify-center text-xs`}
              >
                {checkoutPlan === p.id ? "Opening…" : "Choose plan"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xs font-bold uppercase text-neutral-600">Invoice history</h3>
        {status.billingInvoices.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">No invoices yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-600">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {status.billingInvoices.map((inv, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="py-2 pr-4">
                      {new Date(inv.billedAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-2 pr-4">₹{inv.amountInr.toLocaleString("en-IN")}</td>
                    <td className="py-2 pr-4">{inv.plan}</td>
                    <td className="py-2 capitalize">{inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-sm font-bold text-neutral-900">Cancel subscription?</p>
            <p className="mt-2 text-sm text-neutral-600">
              You will retain access until the end of the current billing period (per Razorpay policy).
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowCancel(false)}>
                Keep plan
              </Button>
              <Button type="button" variant="secondary" onClick={() => void cancelSub()}>
                Cancel subscription
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
