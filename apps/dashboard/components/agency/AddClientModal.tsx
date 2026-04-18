"use client";

import { Button } from "@/components/ui/Button";
import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

type AddClientModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const emptyForm = {
  name: "",
  industry: "",
  tradeName: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  contractValue: "",
  notes: "",
  linkOrgId: "",
};

export function AddClientModal({ open, onClose, onCreated }: AddClientModalProps) {
  const [name, setName] = useState(emptyForm.name);
  const [industry, setIndustry] = useState(emptyForm.industry);
  const [tradeName, setTradeName] = useState(emptyForm.tradeName);
  const [contactName, setContactName] = useState(emptyForm.contactName);
  const [contactPhone, setContactPhone] = useState(emptyForm.contactPhone);
  const [contactEmail, setContactEmail] = useState(emptyForm.contactEmail);
  const [contractValue, setContractValue] = useState(emptyForm.contractValue);
  const [notes, setNotes] = useState(emptyForm.notes);
  const [linkOrgId, setLinkOrgId] = useState(emptyForm.linkOrgId);
  const [mode, setMode] = useState<"create" | "link">("create");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function resetForm() {
    setName(emptyForm.name);
    setIndustry(emptyForm.industry);
    setTradeName(emptyForm.tradeName);
    setContactName(emptyForm.contactName);
    setContactPhone(emptyForm.contactPhone);
    setContactEmail(emptyForm.contactEmail);
    setContractValue(emptyForm.contractValue);
    setNotes(emptyForm.notes);
    setLinkOrgId(emptyForm.linkOrgId);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "create") {
      const n = name.trim();
      if (!n) {
        toast.error("Enter a client name");
        return;
      }
    } else {
      const id = linkOrgId.trim();
      if (!id) {
        toast.error("Enter the existing organization ID to link");
        return;
      }
    }

    const common = {
      contractValue: contractValue ? Number(contractValue) : undefined,
      notes: notes.trim() || undefined,
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      tradeName: tradeName.trim() || undefined,
    };

    setSaving(true);
    try {
      const body =
        mode === "create"
          ? {
              name: name.trim(),
              industry: industry.trim() || undefined,
              ...common,
            }
          : {
              clientOrgId: linkOrgId.trim(),
              ...common,
            };

      const r = await fetch("/api/agency/clients", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not add client");
        return;
      }
      toast.success(mode === "create" ? "Client workspace created" : "Client linked");
      resetForm();
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="absolute inset-0" aria-hidden onClick={() => !saving && onClose()} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-neutral-900">Add client</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Create a new client workspace or link an organization that already exists in Hello Add. Contact and brand
          fields are stored on the agency–client relationship.
        </p>
        <p className="mt-2 text-xs text-neutral-600">
          Assign a subscription plan, platforms, and integration notes in the{" "}
          <Link href="/agency/clients/new" className="font-semibold text-primary underline" onClick={onClose}>
            full onboarding wizard
          </Link>
          .
        </p>

        <div className="mt-4 flex gap-2 rounded-xl bg-neutral-100 p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              mode === "create" ? "bg-white shadow text-neutral-900" : "text-neutral-600"
            }`}
            onClick={() => setMode("create")}
          >
            New client
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              mode === "link" ? "bg-white shadow text-neutral-900" : "text-neutral-600"
            }`}
            onClick={() => setMode("link")}
          >
            Link existing org
          </button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
          {mode === "create" ? (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Client name *
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Retail"
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Brand / trade or agency name (optional)
                <input
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="If different from the workspace name above"
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Industry (optional)
                <input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. E‑commerce"
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Organization ID *
                <input
                  value={linkOrgId}
                  onChange={(e) => setLinkOrgId(e.target.value)}
                  placeholder="Paste org id from admin or invite"
                  className="rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Brand / trade or agency name (optional)
                <input
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="Shown in your client list"
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
            </>
          )}

          <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-3">
            <p className="text-xs font-bold uppercase text-neutral-600">Primary contact</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Contact name
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Person name"
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Mobile
                <input
                  type="tel"
                  inputMode="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 …"
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="sm:col-span-2 flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Email
                <input
                  type="email"
                  inputMode="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@client.com"
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Monthly contract (optional, INR)
            <input
              type="number"
              min={0}
              step={1000}
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              placeholder="0"
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Internal notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Short notes visible to your team on the client record"
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button type="button" className={buttonVariantStyles.ghost} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create client" : "Link client"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
