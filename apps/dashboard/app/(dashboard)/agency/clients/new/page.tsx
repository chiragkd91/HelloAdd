"use client";

import {
  AgencyPlanEditorModal,
  type PlanDraft,
} from "@/components/agency/AgencyPlanEditorModal";
import { Button } from "@/components/ui/Button";
import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import { AGENCY_PLAN_TEMPLATES } from "@/lib/agency/planTemplates";
import { platformHex } from "@/lib/platformColors";
import type {
  AgencyPlanBillingCycle,
  AgencyPlanFeaturesAttrs,
  AgencyPlanLimitsAttrs,
  Platform,
} from "@helloadd/database/agency-plan-types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type PlanRow = {
  id: string;
  planName: string;
  description: string;
  allowedPlatforms: Platform[];
  features: AgencyPlanFeaturesAttrs;
  monthlyPrice: number;
  currency: string;
  billingCycle: AgencyPlanBillingCycle;
  limits: AgencyPlanLimitsAttrs;
  isActive: boolean;
  clientsOnPlan: number;
};

type HintState = "SKIPPED" | "PENDING_MANUAL";

type HintFields = {
  state: HintState;
  manualAccountId: string;
  whatsappPhone: string;
  bsp: string;
};

const PLATFORM_TITLE: Record<Platform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  GOOGLE: "Google Ads",
  LINKEDIN: "LinkedIn",
  YOUTUBE: "YouTube",
  TWITTER: "Twitter / X",
  WHATSAPP: "WhatsApp",
};

const INDUSTRY_OPTIONS = [
  "GPS/Fleet",
  "E-Commerce",
  "Real Estate",
  "Healthcare",
  "EdTech",
  "Food & Beverage",
  "Manufacturing",
  "Retail",
  "Other",
] as const;

function templateToDraft(t: (typeof AGENCY_PLAN_TEMPLATES)[number]["plan"]): PlanDraft {
  return {
    planName: t.planName,
    description: t.description,
    monthlyPrice: t.monthlyPrice,
    currency: t.currency,
    billingCycle: t.billingCycle,
    allowedPlatforms: [...t.allowedPlatforms],
    features: { ...t.features },
    limits: { ...t.limits },
    isActive: true,
  };
}

function NewClientOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prePlanId = searchParams.get("plan");

  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [hintByPlatform, setHintByPlatform] = useState<Partial<Record<Platform, HintFields>>>({});
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [notes, setNotes] = useState("");

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planModalDraft, setPlanModalDraft] = useState<PlanDraft | null>(null);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const r = await fetch("/api/agency/plans", { credentials: "include", cache: "no-store" });
      if (!r.ok) {
        setPlans([]);
        return;
      }
      const j = (await r.json()) as { plans?: PlanRow[] };
      setPlans(j.plans ?? []);
    } catch {
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  function openPlanModal(draft: PlanDraft | null) {
    setPlanModalDraft(draft);
    setPlanModalOpen(true);
  }

  function onPlanSaved(planId?: string) {
    void loadPlans().then(() => {
      if (planId) setSelectedPlanId(planId);
    });
  }

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    const d = new Date();
    setContractStartDate(d.toISOString().slice(0, 10));
  }, []);

  const selectablePlans = useMemo(
    () => plans.filter((p) => p.isActive !== false),
    [plans],
  );

  const selectedPlan = useMemo(
    () => selectablePlans.find((p) => p.id === selectedPlanId) ?? null,
    [selectablePlans, selectedPlanId],
  );

  useEffect(() => {
    if (plansLoading || !prePlanId) return;
    if (selectablePlans.some((p) => p.id === prePlanId)) {
      setSelectedPlanId(prePlanId);
    }
  }, [plansLoading, prePlanId, selectablePlans]);

  useEffect(() => {
    if (step !== 2 || !selectedPlan) return;
    const next: Partial<Record<Platform, HintFields>> = {};
    for (const plat of selectedPlan.allowedPlatforms) {
      next[plat] = { state: "SKIPPED", manualAccountId: "", whatsappPhone: "", bsp: "" };
    }
    setHintByPlatform(next);
  }, [step, selectedPlan]);

  function setHint(plat: Platform, patch: Partial<HintFields>) {
    setHintByPlatform((prev) => {
      const cur = prev[plat] ?? {
        state: "SKIPPED" as const,
        manualAccountId: "",
        whatsappPhone: "",
        bsp: "",
      };
      return { ...prev, [plat]: { ...cur, ...patch } };
    });
  }

  function nextFromStep0() {
    const n = name.trim();
    if (!n) {
      toast.error("Enter the client company name");
      return;
    }
    setStep(1);
  }

  function nextFromStep1() {
    if (!selectablePlans.length) {
      toast.error("Create an active plan first, or turn a plan back on under Agency → Plans.");
      return;
    }
    if (!selectedPlanId || !selectedPlan) {
      toast.error("Choose a plan");
      return;
    }
    setStep(2);
  }

  async function submit() {
    if (!selectedPlan) return;
    const n = name.trim();
    if (!n) {
      toast.error("Enter the client company name");
      return;
    }

    const integrations = selectedPlan.allowedPlatforms.map((plat) => {
      const h = hintByPlatform[plat] ?? {
        state: "SKIPPED" as const,
        manualAccountId: "",
        whatsappPhone: "",
        bsp: "",
      };
      const state = h.state;
      return {
        platform: plat,
        state,
        manualAccountId:
          state === "PENDING_MANUAL" && h.manualAccountId.trim()
            ? h.manualAccountId.trim()
            : null,
        whatsappPhone:
          plat === "WHATSAPP" && state === "PENDING_MANUAL" && h.whatsappPhone.trim()
            ? h.whatsappPhone.trim()
            : null,
        bsp:
          plat === "WHATSAPP" && state === "PENDING_MANUAL" && h.bsp.trim() ? h.bsp.trim() : null,
      };
    });

    setSaving(true);
    try {
      const r = await fetch("/api/agency/clients", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          planId: selectedPlan.id,
          industry: industry.trim() || undefined,
          city: city.trim() || undefined,
          website: website.trim() || undefined,
          tradeName: tradeName.trim() || undefined,
          contactName: contactName.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contractStartDate: contractStartDate.trim() || undefined,
          notes: notes.trim() || undefined,
          integrations,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not create client");
        return;
      }
      toast.success("Client created with plan");
      router.push("/agency");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const stepTitle = ["Client details", "Choose plan", "Integration notes"][step] ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      <div>
        <Link href="/agency" className="text-sm font-semibold text-sky-800 hover:underline">
          ← Agency
        </Link>
        <p className="mt-2 text-xs font-bold uppercase text-neutral-600">
          Step {step + 1} of 3 · {stepTitle}
        </p>
        <h1 className="mt-1 text-[1.75rem] font-bold tracking-tight text-neutral-900">New client</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Onboard a client workspace with an agency plan and integration readiness notes.
        </p>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-neutral-200"}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Company name *
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              placeholder="Client brand or legal name"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Industry (optional)
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            >
              <option value="">Select industry</option>
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              City (optional)
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Website (optional)
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                placeholder="https://"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Brand / trade name (optional)
            <input
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-3">
            <p className="text-xs font-bold uppercase text-neutral-600">Primary contact</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Name
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Mobile
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="sm:col-span-2 flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Email
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Contract start
            <input
              type="date"
              value={contractStartDate}
              onChange={(e) => setContractStartDate(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Internal notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => nextFromStep0()}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {plansLoading && <p className="text-sm text-neutral-600">Loading plans…</p>}
          {!plansLoading && plans.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p>You need at least one agency plan before assigning a new client.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="button" onClick={() => openPlanModal(null)}>
                  Create plan
                </Button>
                <span className="text-xs text-amber-900/80">or</span>
                <Link href="/agency/plans" className="text-sm font-semibold text-primary underline">
                  Open plans page
                </Link>
              </div>
              <p className="mt-3 text-xs text-amber-900/80">Quick start from a template:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {AGENCY_PLAN_TEMPLATES.map((t) => (
                  <Button
                    key={t.label}
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => openPlanModal(templateToDraft(t.plan))}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {!plansLoading && plans.length > 0 && selectablePlans.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p>Every plan is inactive. Turn at least one plan on under Agency → Plans, or create a new plan below.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="text-xs" onClick={() => openPlanModal(null)}>
                  Create plan
                </Button>
                <Link href="/agency/plans" className="text-sm font-semibold text-primary underline">
                  Open plans page
                </Link>
              </div>
            </div>
          )}
          {!plansLoading && selectablePlans.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 pb-3">
                <Button type="button" variant="secondary" className="text-xs" onClick={() => openPlanModal(null)}>
                  + New plan
                </Button>
                {AGENCY_PLAN_TEMPLATES.map((t) => (
                  <Button
                    key={t.label}
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => openPlanModal(templateToDraft(t.plan))}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            <ul className="space-y-2">
              {selectablePlans.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`flex w-full flex-col rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selectedPlanId === p.id
                        ? "border-primary bg-sky-50 ring-1 ring-primary"
                        : "border-neutral-200 bg-white hover:border-neutral-300"
                    }`}
                  >
                    <span className="font-bold text-neutral-900">{p.planName}</span>
                    <span className="text-xs text-neutral-600">
                      ₹{p.monthlyPrice.toLocaleString("en-IN")} / {p.billingCycle} · {p.clientsOnPlan} client
                      {p.clientsOnPlan === 1 ? "" : "s"}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1">
                      {p.allowedPlatforms.map((plat) => (
                        <span
                          key={plat}
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: platformHex(plat) }}
                        >
                          {plat}
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            </>
          )}
          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <button type="button" className={buttonVariantStyles.ghost} onClick={() => setStep(0)}>
              Back
            </button>
            <Button type="button" disabled={!selectablePlans.length} onClick={() => nextFromStep1()}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && selectedPlan && (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-600">
            For each platform in <strong>{selectedPlan.planName}</strong>, record whether the client will connect later
            or you will handle accounts manually.
          </p>
          <ul className="space-y-4">
            {selectedPlan.allowedPlatforms.map((plat) => {
              const h = hintByPlatform[plat] ?? {
                state: "SKIPPED" as const,
                manualAccountId: "",
                whatsappPhone: "",
                bsp: "",
              };
              return (
                <li
                  key={plat}
                  className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className="inline-flex items-center gap-2 text-sm font-bold text-white rounded-full px-3 py-1"
                      style={{ backgroundColor: platformHex(plat) }}
                    >
                      {PLATFORM_TITLE[plat]}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        h.state === "SKIPPED" ? "bg-primary text-white" : "bg-white text-neutral-700 ring-1 ring-neutral-200"
                      }`}
                      onClick={() => setHint(plat, { state: "SKIPPED" })}
                    >
                      Skip for now
                    </button>
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        h.state === "PENDING_MANUAL"
                          ? "bg-primary text-white"
                          : "bg-white text-neutral-700 ring-1 ring-neutral-200"
                      }`}
                      onClick={() => setHint(plat, { state: "PENDING_MANUAL" })}
                    >
                      Manual / later
                    </button>
                  </div>
                  {h.state === "PENDING_MANUAL" && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {plat === "WHATSAPP" ? (
                        <>
                          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600 sm:col-span-2">
                            WhatsApp number (optional note)
                            <input
                              value={h.whatsappPhone}
                              onChange={(e) => setHint(plat, { whatsappPhone: e.target.value })}
                              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600 sm:col-span-2">
                            BSP / provider note (optional)
                            <input
                              value={h.bsp}
                              onChange={(e) => setHint(plat, { bsp: e.target.value })}
                              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                            />
                          </label>
                        </>
                      ) : (
                        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600 sm:col-span-2">
                          Account / asset ID note (optional)
                          <input
                            value={h.manualAccountId}
                            onChange={(e) => setHint(plat, { manualAccountId: e.target.value })}
                            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                            placeholder="e.g. ad account id, page id"
                          />
                        </label>
                      )}
                    </div>
                  )}
                  <div className="mt-3 text-[11px] text-neutral-600">
                    Status:{" "}
                    <span className="font-semibold text-neutral-700">
                      {h.state === "PENDING_MANUAL" ? "Pending" : "Skipped"}
                    </span>
                    {plat !== "WHATSAPP" && (
                      <>
                        {" "}
                        · OAuth connect is available after client creation from the Integration page.
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <button type="button" className={buttonVariantStyles.ghost} onClick={() => setStep(1)}>
              Back
            </button>
            <Button type="button" disabled={saving} onClick={() => void submit()}>
              {saving ? "Creating…" : "Create client"}
            </Button>
          </div>
        </div>
      )}

      <AgencyPlanEditorModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        editingId={null}
        initialDraft={planModalDraft}
        onSaved={onPlanSaved}
      />
    </div>
  );
}

export default function NewClientOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl space-y-4 py-12">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-neutral-100" />
        </div>
      }
    >
      <NewClientOnboardingContent />
    </Suspense>
  );
}
