"use client";

import { Button } from "@/components/ui/Button";
import { platformHex } from "@/lib/platformColors";
import type {
  AgencyPlanBillingCycle,
  AgencyPlanFeaturesAttrs,
  AgencyPlanLimitsAttrs,
  Platform,
} from "@helloadd/database/agency-plan-types";
import { AgencyPlanBillingCycleValues, PlatformValues } from "@helloadd/database/enums";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const PLATFORM_BLURB: Record<Platform, { title: string; lines: string }> = {
  FACEBOOK: {
    title: "Facebook",
    lines: "Ad campaigns, lead forms, organic posts, comments",
  },
  INSTAGRAM: {
    title: "Instagram",
    lines: "Ad campaigns, organic posts, stories, reels, comments",
  },
  GOOGLE: {
    title: "Google Ads",
    lines: "Search/Display campaigns, keywords, conversions",
  },
  LINKEDIN: {
    title: "LinkedIn",
    lines: "Ad campaigns, organic posts, lead gen forms",
  },
  YOUTUBE: {
    title: "YouTube",
    lines: "Video ad campaigns, views, engagement",
  },
  WHATSAPP: {
    title: "WhatsApp",
    lines: "Business alerts, broadcast scheduling, status posts",
  },
  TWITTER: {
    title: "Twitter / X",
    lines: "Organic posts, basic analytics",
  },
};

const LIMIT_OPTIONS = {
  socialAccounts: [5, 10, 20, -1],
  campaigns: [10, 25, 50, -1],
  teamMembers: [1, 2, 5, 10, -1],
  scheduledPostsPerMonth: [100, 500, 2000, -1],
} as const;

/** Master prompt Task 1.2: 0 / 500 / 1000 / 2000 per month */
const AI_CREDIT_PRESETS = [0, 500, 1000, 2000] as const;

function formatLimit(n: number) {
  return n < 0 ? "Unlimited" : String(n);
}

const defaultFeatures = (): AgencyPlanFeaturesAttrs => ({
  postScheduling: false,
  adTracking: true,
  aiCredits: 0,
  reviewManagement: false,
  leadCapture: false,
  whatsappAlerts: false,
  whatsappScheduling: false,
  unifiedInbox: false,
  advancedReports: false,
  bulkScheduling: false,
});

const defaultLimits = (): AgencyPlanLimitsAttrs => ({
  socialAccounts: 5,
  campaigns: 10,
  teamMembers: 2,
  scheduledPostsPerMonth: 100,
});

export type PlanDraft = {
  planName: string;
  description: string;
  monthlyPrice: number;
  currency: string;
  billingCycle: AgencyPlanBillingCycle;
  allowedPlatforms: Platform[];
  features: AgencyPlanFeaturesAttrs;
  limits: AgencyPlanLimitsAttrs;
  /** When editing, whether the plan appears in pickers; new plans default to active. */
  isActive?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** When set, PUT on save. */
  editingId: string | null;
  /** Initial field values (new plan or duplicate). */
  initialDraft: PlanDraft | null;
  /** Called after a successful save; `planId` is set for create/update responses from the API. */
  onSaved: (planId?: string) => void;
};

export function AgencyPlanEditorModal({ open, onClose, editingId, initialDraft, onSaved }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState(4999);
  const [billingCycle, setBillingCycle] = useState<AgencyPlanBillingCycle>("MONTHLY");
  const [allowedPlatforms, setAllowedPlatforms] = useState<Platform[]>([]);
  const [features, setFeatures] = useState<AgencyPlanFeaturesAttrs>(defaultFeatures);
  const [limits, setLimits] = useState<AgencyPlanLimitsAttrs>(defaultLimits);
  const [isActive, setIsActive] = useState(true);

  const resetFromDraft = useCallback((d: PlanDraft | null) => {
    if (!d) {
      setPlanName("");
      setDescription("");
      setMonthlyPrice(4999);
      setBillingCycle("MONTHLY");
      setAllowedPlatforms([]);
      setFeatures(defaultFeatures());
      setLimits(defaultLimits());
      setIsActive(true);
      return;
    }
    setPlanName(d.planName);
    setDescription(d.description);
    setMonthlyPrice(d.monthlyPrice);
    setBillingCycle(d.billingCycle);
    setAllowedPlatforms([...d.allowedPlatforms]);
    setFeatures({ ...d.features });
    setLimits({ ...d.limits });
    setIsActive(d.isActive !== false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    resetFromDraft(initialDraft);
  }, [open, initialDraft, resetFromDraft]);

  if (!open) return null;

  function togglePlatform(p: Platform) {
    setAllowedPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function patchFeatures(patch: Partial<AgencyPlanFeaturesAttrs>) {
    setFeatures((f) => ({ ...f, ...patch }));
  }

  async function save() {
    const n = planName.trim();
    if (!n) {
      toast.error("Plan name is required");
      return;
    }
    if (allowedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    setSaving(true);
    try {
      const safePrice = Number.isFinite(monthlyPrice) && monthlyPrice >= 0 ? monthlyPrice : 0;
      const body = {
        planName: n,
        description: description.trim(),
        monthlyPrice: safePrice,
        currency: "INR",
        billingCycle,
        allowedPlatforms,
        features,
        limits,
        isActive: editingId ? isActive : true,
      };
      const url = editingId ? `/api/agency/plans/${editingId}` : "/api/agency/plans";
      const r = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not save plan");
        return;
      }
      toast.success(editingId ? "Plan updated" : "Plan created");
      onSaved(typeof j.id === "string" ? j.id : undefined);
      onClose();
    } catch {
      toast.error("Could not save plan");
    } finally {
      setSaving(false);
    }
  }

  const steps = ["Basics", "Platforms", "Features", "Limits", "Summary"];

  function canProceedFromStep(s: number): boolean {
    if (s === 0) {
      return (
        planName.trim().length > 0 &&
        Number.isFinite(monthlyPrice) &&
        monthlyPrice >= 0
      );
    }
    if (s === 1) {
      return allowedPlatforms.length > 0;
    }
    return true;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="absolute inset-0" aria-hidden onClick={() => !saving && onClose()} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-bold text-neutral-900">
            {editingId ? "Edit plan" : "Create plan"}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {steps.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(i)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  step === i ? "bg-primary text-white" : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {i + 1}. {label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {step === 0 && (
            <div className="space-y-4">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Plan name
                <input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  placeholder="Social Starter"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Monthly price (INR)
                <input
                  type="number"
                  min={0}
                  value={monthlyPrice}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMonthlyPrice(Number.isFinite(v) && v >= 0 ? v : 0);
                  }}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm tabular-nums"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Billing cycle
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as AgencyPlanBillingCycle)}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                >
                  {AgencyPlanBillingCycleValues.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0) + c.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
              {editingId && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-100 px-3 py-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-primary"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span>
                    <span className="font-semibold text-neutral-900">Active plan</span>
                    <span className="mt-0.5 block text-xs text-neutral-600">
                      Turn off to archive: the plan stays in your list but you can hide it from assignment UIs later.
                    </span>
                  </span>
                </label>
              )}
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {PlatformValues.map((p) => {
                const meta = PLATFORM_BLURB[p];
                const on = allowedPlatforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`rounded-2xl border-2 p-4 text-left transition-colors ${
                      on ? "border-primary bg-primary/5" : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: platformHex(p) }}
                      />
                      <span className="font-bold text-neutral-900">{meta.title}</span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-600">{meta.lines}</p>
                  </button>
                );
              })}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3 text-sm">
              {(
                [
                  ["postScheduling", "Post scheduling", "Schedule organic posts to selected platforms"],
                  ["adTracking", "Ad tracking", "Monitor paid campaign CTR, spend, ROAS"],
                  ["whatsappAlerts", "WhatsApp alerts", "Budget, CTR drop, campaign alerts to WA"],
                  ["whatsappScheduling", "WhatsApp scheduling", "Schedule WA status + broadcast messages"],
                  ["reviewManagement", "Review management", "Google, JustDial, IndiaMart reviews"],
                  ["leadCapture", "Lead capture", "FB/Google lead forms → dashboard"],
                  ["unifiedInbox", "Unified inbox", "Comments + DMs from all platforms"],
                  ["bulkScheduling", "Bulk scheduling", "CSV upload for many posts"],
                  ["advancedReports", "Advanced reports", "PDF, Excel, CEO briefing, auto-email"],
                ] as const
              ).map(([key, label, help]) => (
                <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-100 px-3 py-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-primary"
                    checked={Boolean(features[key])}
                    onChange={(e) => patchFeatures({ [key]: e.target.checked })}
                  />
                  <span>
                    <span className="font-semibold text-neutral-900">{label}</span>
                    <span className="mt-0.5 block text-xs text-neutral-600">{help}</span>
                  </span>
                </label>
              ))}
              <div className="rounded-xl border border-neutral-100 px-3 py-3">
                <p className="text-xs font-bold uppercase text-neutral-600">AI credits / month</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AI_CREDIT_PRESETS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => patchFeatures({ aiCredits: n })}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        features.aiCredits === n
                          ? "bg-primary text-white"
                          : "bg-neutral-100 text-neutral-800 ring-1 ring-neutral-200 hover:bg-neutral-200"
                      }`}
                    >
                      {n === 0 ? "None" : `${n.toLocaleString("en-IN")}`}
                    </button>
                  ))}
                </div>
                {!AI_CREDIT_PRESETS.includes(features.aiCredits as (typeof AI_CREDIT_PRESETS)[number]) && (
                  <p className="mt-2 text-xs text-amber-900">
                    This plan has {features.aiCredits} credits (not a preset). Choose a preset above to replace it.
                  </p>
                )}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4 text-sm">
              {(
                [
                  ["socialAccounts", "Social accounts"] as const,
                  ["campaigns", "Campaigns"] as const,
                  ["teamMembers", "Team members"] as const,
                  ["scheduledPostsPerMonth", "Scheduled posts / month"] as const,
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                  {label}
                  <select
                    value={limits[key]}
                    onChange={(e) =>
                      setLimits((L) => ({ ...L, [key]: Number(e.target.value) }))
                    }
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  >
                    {LIMIT_OPTIONS[key].map((n) => (
                      <option key={n} value={n}>
                        {formatLimit(n)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
          {step === 4 && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
              <p className="font-bold text-neutral-900">{planName || "—"}</p>
              <p className="mt-1 text-neutral-600">{description || "No description"}</p>
              <p className="mt-3 font-semibold tabular-nums text-neutral-900">
                ₹{monthlyPrice.toLocaleString("en-IN")} / {billingCycle.toLowerCase()}
              </p>
              <p className="mt-2 text-xs font-bold uppercase text-neutral-600">Platforms</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {allowedPlatforms.map((p) => (
                  <span
                    key={p}
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                    style={{ backgroundColor: platformHex(p) }}
                  >
                    {PLATFORM_BLURB[p].title}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-neutral-600">
                Limits: {formatLimit(limits.socialAccounts)} accounts · {formatLimit(limits.campaigns)}{" "}
                campaigns · {formatLimit(limits.teamMembers)} team ·{" "}
                {formatLimit(limits.scheduledPostsPerMonth)} posts/mo
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 px-6 py-4">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button type="button" variant="secondary" disabled={saving} onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {step < 4 && (
              <Button
                type="button"
                disabled={saving || !canProceedFromStep(step)}
                onClick={() => setStep((s) => s + 1)}
              >
                Next
              </Button>
            )}
            {step === 4 && (
              <Button type="button" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save plan"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
