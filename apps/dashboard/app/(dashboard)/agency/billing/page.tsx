"use client";

import { Button } from "@/components/ui/Button";
import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type Summary = {
  totalMonthlyRevenue: number;
  activeClients: number;
  inactiveClients: number;
  invoicesPendingAmount: number;
  thisMonthCollected: number;
};

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  clientOrgId: string;
  clientName: string;
  planName: string | null;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
  billingPeriodFrom: string;
  billingPeriodTo: string;
  createdAt: string;
};

type ClientPicker = {
  clientOrgId: string;
  name: string;
  contractValue: number;
  status: string;
  assignedPlanId: string | null;
  planName: string | null;
};

export default function AgencyBillingPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [clients, setClients] = useState<ClientPicker[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [pickClient, setPickClient] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/agency/billing", { credentials: "include", cache: "no-store" });
      if (!r.ok) {
        toast.error("Could not load billing");
        return;
      }
      const j = (await r.json()) as {
        summary?: Summary;
        invoices?: InvoiceRow[];
        clients?: ClientPicker[];
      };
      setSummary(j.summary ?? null);
      setInvoices(j.invoices ?? []);
      setClients(j.clients ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createDraft() {
    if (!pickClient) {
      toast.error("Choose a client");
      return;
    }
    setCreating(true);
    try {
      const r = await fetch("/api/agency/billing", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientOrgId: pickClient }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; invoiceNumber?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not create");
        return;
      }
      toast.success(`Draft ${j.invoiceNumber ?? ""} created`);
      setCreateOpen(false);
      setPickClient("");
      void load();
    } finally {
      setCreating(false);
    }
  }

  async function patchInvoice(id: string, body: Record<string, unknown>) {
    const r = await fetch(`/api/agency/billing/invoices/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) {
      toast.error(typeof j.error === "string" ? j.error : "Update failed");
      return;
    }
    toast.success("Updated");
    void load();
  }

  async function sendInvoiceEmail(id: string) {
    const r = await fetch(`/api/agency/billing/invoices/${id}/send`, {
      method: "POST",
      credentials: "include",
    });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) {
      toast.error(typeof j.error === "string" ? j.error : "Could not send email");
      return;
    }
    toast.success("Invoice emailed");
    void load();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/agency" className="text-sm font-semibold text-sky-800 hover:underline">
            ← Agency
          </Link>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight text-neutral-900">Agency billing</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Revenue roll-up, invoice drafts, and payment status for managed clients.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Generate invoice
        </Button>
      </div>

      {loading && <p className="text-sm text-neutral-600">Loading…</p>}

      {!loading && summary && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              k: "Total monthly revenue (active)",
              v: `₹${summary.totalMonthlyRevenue.toLocaleString("en-IN")}`,
            },
            {
              k: "Clients",
              v: `${summary.activeClients} active · ${summary.inactiveClients} inactive`,
            },
            {
              k: "Invoices pending",
              v: `₹${summary.invoicesPendingAmount.toLocaleString("en-IN")}`,
              warn: summary.invoicesPendingAmount > 0,
            },
            {
              k: "Collected this month",
              v: `₹${summary.thisMonthCollected.toLocaleString("en-IN")}`,
            },
          ].map((x) => (
            <div
              key={x.k}
              className={`rounded-2xl border p-4 shadow-sm ${
                x.warn ? "border-red-200 bg-red-50" : "border-neutral-200 bg-white"
              }`}
            >
              <p className="text-xs font-bold uppercase text-neutral-600">{x.k}</p>
              <p className="mt-2 text-xl font-bold tabular-nums text-neutral-900">{x.v}</p>
            </div>
          ))}
        </section>
      )}

      {!loading && (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="min-w-[960px] w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-bold uppercase text-neutral-600">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Monthly</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-600">
                    No invoices yet. Generate a draft to get started.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-neutral-100">
                    <td className="px-4 py-3 font-medium text-neutral-900">{inv.clientName}</td>
                    <td className="px-4 py-3 text-neutral-600">{inv.planName ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">₹{inv.totalAmount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          inv.status === "PAID"
                            ? "bg-emerald-100 text-emerald-900"
                            : inv.status === "OVERDUE"
                              ? "bg-red-100 text-red-900"
                              : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {new Date(inv.billingPeriodFrom).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-xs">{new Date(inv.dueDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <a
                          href={`/api/agency/billing/invoices/${inv.id}/pdf`}
                          className="text-xs font-semibold text-sky-800 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          PDF
                        </a>
                        {inv.status !== "PAID" && (
                          <>
                            <button
                              type="button"
                              className="text-xs font-semibold text-primary hover:underline"
                              onClick={() => void patchInvoice(inv.id, { markPaid: true })}
                            >
                              Mark paid
                            </button>
                            <button
                              type="button"
                              className="text-xs font-semibold text-emerald-800 hover:underline"
                              onClick={() => void sendInvoiceEmail(inv.id)}
                            >
                              Email client
                            </button>
                          </>
                        )}
                        {inv.status === "DRAFT" && (
                          <button
                            type="button"
                            className="text-xs font-semibold text-neutral-600 hover:underline"
                            onClick={() => void patchInvoice(inv.id, { status: "SENT" })}
                          >
                            Mark sent
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && clients.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-neutral-600">Client billing actions</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="text-left text-xs font-bold uppercase text-neutral-600">
                <tr>
                  <th className="px-2 py-2">Client</th>
                  <th className="px-2 py-2">Plan</th>
                  <th className="px-2 py-2">Monthly price</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.clientOrgId} className="border-t border-neutral-100">
                    <td className="px-2 py-2 font-medium text-neutral-900">{client.name}</td>
                    <td className="px-2 py-2 text-neutral-600">{client.planName ?? "—"}</td>
                    <td className="px-2 py-2 tabular-nums">₹{client.contractValue.toLocaleString("en-IN")}</td>
                    <td className="px-2 py-2">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-700">
                        {client.status}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="text-xs font-semibold text-primary hover:underline"
                          onClick={() => {
                            setPickClient(client.clientOrgId);
                            setCreateOpen(true);
                          }}
                        >
                          Send invoice
                        </button>
                        <Link
                          href={`/agency/clients/${client.clientOrgId}/history`}
                          className="text-xs font-semibold text-sky-800 hover:underline"
                        >
                          View history
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-neutral-600">
        PDF downloads and &quot;Email client&quot; use Resend when{" "}
        <code className="rounded bg-neutral-100 px-1">RESEND_API_KEY</code> is set; client billing contact email comes
        from the agency–client relation. Optional:{" "}
        <code className="rounded bg-neutral-100 px-1">AGENCY_INVOICE_PAYMENT_NOTE</code> for PDF payment lines. Monthly
        cron: <code className="rounded bg-neutral-100 px-1">GET /api/cron/agency-invoices</code> with{" "}
        <code className="rounded bg-neutral-100 px-1">Authorization: Bearer CRON_SECRET</code>.
      </p>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="absolute inset-0" aria-hidden onClick={() => !creating && setCreateOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-neutral-900">New draft invoice</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Uses the client&apos;s plan price (or contract value) with 18% GST. Billing period defaults to this month.
            </p>
            <label className="mt-4 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Client
              <select
                value={pickClient}
                onChange={(e) => setPickClient(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {clients
                  .filter((c) => c.status === "ACTIVE")
                  .map((c) => (
                    <option key={c.clientOrgId} value={c.clientOrgId}>
                      {c.name} ({c.planName ?? "No plan"})
                    </option>
                  ))}
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={buttonVariantStyles.ghost} onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </button>
              <Button type="button" disabled={creating} onClick={() => void createDraft()}>
                {creating ? "Creating…" : "Create draft"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
