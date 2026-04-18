"use client";

import {
  AgencyPlanEditorModal,
  type PlanDraft,
} from "@/components/agency/AgencyPlanEditorModal";
import { Button } from "@/components/ui/Button";
import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AGENCY_PLAN_TEMPLATES } from "@/lib/agency/planTemplates";
import { platformHex } from "@/lib/platformColors";
import type {
  AgencyPlanBillingCycle,
  AgencyPlanFeaturesAttrs,
  AgencyPlanLimitsAttrs,
  Platform,
} from "@helloadd/database/agency-plan-types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

const FEATURE_LABELS: Partial<Record<keyof AgencyPlanFeaturesAttrs, string>> = {
  postScheduling: "Post scheduling",
  adTracking: "Ad tracking",
  reviewManagement: "Review management",
  leadCapture: "Lead capture",
  whatsappAlerts: "WhatsApp alerts",
  whatsappScheduling: "WhatsApp scheduling",
  unifiedInbox: "Unified inbox",
  advancedReports: "Advanced reports",
  bulkScheduling: "Bulk scheduling",
};

function featureSummaryLines(f: AgencyPlanFeaturesAttrs | null | undefined): string[] {
  if (!f || typeof f !== "object") return [];
  const lines: string[] = [];
  for (const key of Object.keys(FEATURE_LABELS) as (keyof AgencyPlanFeaturesAttrs)[]) {
    if (key === "aiCredits") continue;
    if (f[key] === true) {
      const label = FEATURE_LABELS[key];
      if (label) lines.push(label);
    }
  }
  if (f.aiCredits > 0) lines.push(`${f.aiCredits} AI credits / mo`);
  return lines;
}

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

function planRowToDraft(row: PlanRow, planNameOverride?: string): PlanDraft {
  return {
    planName: planNameOverride ?? row.planName,
    description: row.description,
    monthlyPrice: row.monthlyPrice,
    currency: row.currency,
    billingCycle: row.billingCycle,
    allowedPlatforms: [...row.allowedPlatforms],
    features: { ...row.features },
    limits: { ...row.limits },
    isActive: planNameOverride !== undefined ? true : row.isActive,
  };
}

export default function AgencyPlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialDraft, setInitialDraft] = useState<PlanDraft | null>(null);
  const [planDeleteId, setPlanDeleteId] = useState<string | null>(null);
  const [planDeleteLoading, setPlanDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/agency/plans", { credentials: "include", cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as { plans?: PlanRow[]; error?: string };
      if (!r.ok) {
        setPlans([]);
        const msg =
          r.status === 403
            ? "Agency workspace is required — enable it under Settings → Organization."
            : typeof j.error === "string"
              ? j.error
              : "Could not load plans";
        toast.error(msg);
        return;
      }
      setPlans(j.plans ?? []);
    } catch {
      setPlans([]);
      toast.error("Could not load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate(draft: PlanDraft | null) {
    setEditingId(null);
    setInitialDraft(draft);
    setModalOpen(true);
  }

  function openEdit(p: PlanRow) {
    setEditingId(p.id);
    setInitialDraft(planRowToDraft(p));
    setModalOpen(true);
  }

  async function confirmRemovePlan() {
    if (!planDeleteId) return;
    const id = planDeleteId;
    setPlanDeleteLoading(true);
    try {
      const r = await fetch(`/api/agency/plans/${id}`, { method: "DELETE", credentials: "include" });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not delete");
        return;
      }
      toast.success("Plan deleted");
      setPlanDeleteId(null);
      void load();
    } catch {
      toast.error("Could not delete plan");
    } finally {
      setPlanDeleteLoading(false);
    }
  }

  const hasPlans = plans.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/agency" className="text-sm font-semibold text-sky-800 hover:underline">
            ← Agency
          </Link>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight text-neutral-900">Agency plans</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Build custom packages (platforms, features, limits) and assign them when adding clients.
          </p>
        </div>
        <Button type="button" onClick={() => openCreate(null)}>
          Create plan
        </Button>
      </div>

      {loading && <p className="text-sm text-neutral-600">Loading plans…</p>}

      {!loading && !hasPlans && (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-neutral-900">No plans yet</p>
          <p className="mt-1 text-sm text-neutral-600">
            Create at least one plan before you can assign packages to new clients.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            {AGENCY_PLAN_TEMPLATES.map((t) => (
              <Button key={t.label} type="button" variant="secondary" onClick={() => openCreate(templateToDraft(t.plan))}>
                Use: {t.label}
              </Button>
            ))}
            <Button type="button" onClick={() => openCreate(null)}>
              Blank plan
            </Button>
          </div>
        </div>
      )}

      {!loading && hasPlans && (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-neutral-900">{p.planName}</h2>
                  <p className="mt-1 text-xs text-neutral-600">{p.description || "—"}</p>
                </div>
                <p className="text-sm font-bold tabular-nums text-neutral-900">
                  ₹{Number(p.monthlyPrice ?? 0).toLocaleString("en-IN")}{" "}
                  <span className="text-xs font-normal text-neutral-600">/ {p.billingCycle}</span>
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {(p.allowedPlatforms ?? []).map((plat) => (
                  <span
                    key={plat}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                    style={{ backgroundColor: platformHex(plat) }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
                    {plat}
                  </span>
                ))}
              </div>
              {featureSummaryLines(p.features).length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-600">
                  {featureSummaryLines(p.features).map((line) => (
                    <li key={line} className="font-medium text-primary">
                      • {line}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-neutral-600">
                {Number(p.clientsOnPlan ?? 0)} client{Number(p.clientsOnPlan ?? 0) === 1 ? "" : "s"} on this plan
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/agency/clients/new?plan=${encodeURIComponent(p.id)}`}
                  className={buttonVariantStyles.secondary}
                >
                  Assign to new client
                </Link>
                <Button type="button" variant="secondary" onClick={() => openEdit(p)}>
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openCreate(planRowToDraft(p, `${p.planName} (copy)`))}
                >
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-red-800"
                  onClick={() => setPlanDeleteId(p.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && hasPlans && (
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
          <p className="text-xs font-bold uppercase text-neutral-600">Quick templates</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {AGENCY_PLAN_TEMPLATES.map((t) => (
              <Button key={t.label} type="button" variant="secondary" className="text-xs" onClick={() => openCreate(templateToDraft(t.plan))}>
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={planDeleteId !== null}
        title="Delete this plan?"
        message="Only plans with no clients assigned can be deleted. This cannot be undone."
        confirmLabel="Delete plan"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={planDeleteLoading}
        onConfirm={() => void confirmRemovePlan()}
        onCancel={() => !planDeleteLoading && setPlanDeleteId(null)}
      />

      <AgencyPlanEditorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingId={editingId}
        initialDraft={initialDraft}
        onSaved={() => void load()}
      />
    </div>
  );
}
