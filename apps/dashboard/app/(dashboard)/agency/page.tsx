"use client";

import { AddClientModal } from "@/components/agency/AddClientModal";
import { AgencyClientMobileCards } from "@/components/agency/AgencyClientMobileCards";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import { platformLabel } from "@/lib/campaignDisplay";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type OrgPayload = {
  name: string;
  plan?: string;
  isAgency: boolean;
  aiHealthScore: number | null;
  aiHealthLabel: string | null;
};

type OverviewPayload = {
  agencyName?: string;
  totalSpend: number;
  totalLeads: number;
  avgCTR: number;
  issueCount: number;
  activeCampaigns: number;
  clients: Array<{
    id: string;
    name: string;
    industry: string | null;
    health: string;
    spend: number;
    platforms: Array<{ platform: string; ctr: number }>;
    issues: number;
    adsLive: number;
    adsPaused: number;
    adsTotal: number;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    tradeName: string | null;
  }>;
  byPlatform: Array<{
    platform: string;
    clientName: string;
    clientId: string;
    spend: number;
    ctr: number;
  }>;
};

export default function AgencyPage() {
  const router = useRouter();
  const { organizations } = useAuth();
  const orgRole = organizations[0]?.role;
  const canSetAgency = orgRole === "OWNER" || orgRole === "ADMIN";
  const canManageClients =
    orgRole === "OWNER" || orgRole === "ADMIN" || orgRole === "MANAGER";

  const [org, setOrg] = useState<OrgPayload | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [view, setView] = useState<"company" | "platform">("company");
  const [loading, setLoading] = useState(true);
  const [ovLoading, setOvLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const loadOrg = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/organization", { credentials: "include", cache: "no-store" });
      if (!r.ok) {
        setError("Could not load organization");
        return;
      }
      const data = (await r.json()) as OrgPayload;
      setOrg(data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setOvLoading(true);
    try {
      const r = await fetch("/api/agency/overview", { credentials: "include", cache: "no-store" });
      if (!r.ok) {
        setOverview(null);
        return;
      }
      setOverview((await r.json()) as OverviewPayload);
    } catch {
      setOverview(null);
    } finally {
      setOvLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrg();
  }, [loadOrg]);

  useEffect(() => {
    if (org?.isAgency) void loadOverview();
  }, [org?.isAgency, loadOverview]);

  async function refreshScores() {
    setRefreshing(true);
    setRunMessage(null);
    try {
      const r = await fetch("/api/agency/refresh-scores", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as {
        score?: number;
        label?: string;
        error?: string;
      };
      if (!r.ok) {
        setRunMessage(typeof j.error === "string" ? j.error : "Could not refresh scores");
        return;
      }
      if (typeof j.score === "number") {
        setOrg((o) =>
          o
            ? {
                ...o,
                aiHealthScore: j.score!,
                aiHealthLabel: typeof j.label === "string" ? j.label : o.aiHealthLabel,
              }
            : o,
        );
        setRunMessage(`Health score updated: ${j.score} (${j.label ?? "—"})`);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function runAnalysis() {
    setRunning(true);
    setRunMessage(null);
    try {
      const r = await fetch("/api/agency/analyze-run", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as {
        suggestions?: unknown[];
        errorsDetected?: number;
        error?: string;
      };
      if (!r.ok) {
        setRunMessage(typeof j.error === "string" ? j.error : "Analysis run failed");
        return;
      }
      const n = Array.isArray(j.suggestions) ? j.suggestions.length : 0;
      setRunMessage(
        `Analysis complete: ${n} budget suggestion row(s); ${j.errorsDetected ?? 0} error alert(s) processed.`,
      );
    } finally {
      setRunning(false);
    }
  }

  async function enableAgencyWorkspace() {
    if (!canSetAgency) return;
    try {
      const r = await fetch("/api/organization", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAgency: true }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not enable agency mode");
        return;
      }
      toast.success("Agency workspace enabled");
      await loadOrg();
      router.refresh();
    } catch {
      toast.error("Network error");
    }
  }

  async function generateClientLink(clientId: string) {
    setLinkingId(clientId);
    try {
      const r = await fetch(`/api/agency/clients/${clientId}/portal-link`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not create link");
        return;
      }
      if (j.url) {
        await navigator.clipboard.writeText(j.url);
        toast.success("Client portal link copied to clipboard");
      }
    } catch {
      toast.error("Could not copy link");
    } finally {
      setLinkingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-sm text-amber-950">
        {error ?? "Could not load workspace."}
      </div>
    );
  }

  const score = org.aiHealthScore;
  const label = org.aiHealthLabel;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Agency</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Multi-client overview, platform roll-up, and workspace health tools.
        </p>
        {org.isAgency && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href="/agency/plans" className="font-semibold text-primary hover:underline">
              Agency plans
            </Link>
            <Link href="/agency/billing" className="font-semibold text-primary hover:underline">
              Agency billing
            </Link>
            {canManageClients && (
              <Link href="/agency/clients/new" className="font-semibold text-primary hover:underline">
                New client with plan
              </Link>
            )}
          </div>
        )}
      </div>

      {!org.isAgency && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-950">
          <p>
            Enable <strong>Agency workspace</strong> to see client lists and roll-up KPIs here. You can turn it
            on in{" "}
            <Link href="/settings?tab=Organization" className="font-semibold text-primary underline">
              Settings → Organization
            </Link>
            .
          </p>
          {canSetAgency ? (
            <Button type="button" className="mt-3" onClick={() => void enableAgencyWorkspace()}>
              Enable agency workspace
            </Button>
          ) : (
            <p className="mt-3 text-xs text-sky-900/80">
              Ask a workspace owner or admin to enable this in Settings → Organization.
            </p>
          )}
        </div>
      )}

      {org.isAgency && (
        <>
          {ovLoading && (
            <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
          )}
          {overview && !ovLoading && (
            <>
              <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
                {[
                  { k: "Total spend (clients)", v: overview.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
                  { k: "Total leads", v: String(overview.totalLeads) },
                  { k: "Avg CTR %", v: overview.avgCTR.toFixed(2) },
                  { k: "Active campaigns", v: String(overview.activeCampaigns) },
                  { k: "Issues (est.)", v: String(overview.issueCount) },
                ].map((x) => (
                  <div
                    key={x.k}
                    className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-xs font-bold uppercase text-neutral-600">{x.k}</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900">{x.v}</p>
                  </div>
                ))}
              </section>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setView("company")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      view === "company" ? "bg-primary text-white" : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    Company-wise
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("platform")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      view === "platform" ? "bg-primary text-white" : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    Platform-wise
                  </button>
                </div>
                {canManageClients && (
                  <Button type="button" className="w-full sm:ml-auto sm:w-auto" onClick={() => setAddClientOpen(true)}>
                    Add client
                  </Button>
                )}
              </div>

              {view === "company" && (
                <>
                  {overview.clients.length === 0 ? (
                    <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
                      <p className="text-sm text-neutral-600">No clients yet.</p>
                      {canManageClients && (
                        <Button type="button" className="mt-4" onClick={() => setAddClientOpen(true)}>
                          Add your first client
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <AgencyClientMobileCards
                        clients={overview.clients}
                        agencyLabel={overview.agencyName ?? org.name}
                        linkingId={linkingId}
                        onGenerateLink={(clientId) => void generateClientLink(clientId)}
                      />
                      <div className="hidden overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm md:block">
                    <table className="min-w-[960px] w-full text-sm">
                      <thead className="bg-neutral-50 text-left text-xs font-bold uppercase text-neutral-600">
                        <tr>
                          <th className="px-4 py-3">Client</th>
                          <th className="px-4 py-3">Brand / trade</th>
                          <th className="px-4 py-3">Contact</th>
                          <th className="px-4 py-3">Mobile</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Your agency</th>
                          <th className="px-4 py-3">Industry</th>
                          <th className="px-4 py-3">Ads</th>
                          <th className="px-4 py-3">Spend</th>
                          <th className="px-4 py-3">Issues</th>
                          <th className="px-4 py-3">Health</th>
                          <th className="px-4 py-3">Platforms</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.clients.map((c) => {
                          const agencyLabel = overview.agencyName ?? org.name;
                          const platformSummary =
                            c.platforms.length === 0
                              ? "—"
                              : c.platforms
                                  .slice(0, 3)
                                  .map((p) => platformLabel(p.platform))
                                  .join(", ") + (c.platforms.length > 3 ? "…" : "");
                          return (
                            <tr key={c.id} className="border-t border-neutral-100">
                              <td className="px-4 py-3 align-top">
                                <Link
                                  href={`/agency/clients/${c.id}`}
                                  className="font-bold text-neutral-900 hover:underline"
                                >
                                  {c.name}
                                </Link>
                              </td>
                              <td className="max-w-[140px] px-4 py-3 align-top text-neutral-700">
                                {c.tradeName?.trim() || "—"}
                              </td>
                              <td className="max-w-[120px] px-4 py-3 align-top text-neutral-700">
                                {c.contactName?.trim() || "—"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 align-top tabular-nums text-neutral-800">
                                {c.contactPhone?.trim() || "—"}
                              </td>
                              <td className="max-w-[160px] truncate px-4 py-3 align-top text-neutral-700">
                                {c.contactEmail?.trim() ? (
                                  <a
                                    href={`mailto:${c.contactEmail.trim()}`}
                                    className="text-sky-800 hover:underline"
                                  >
                                    {c.contactEmail.trim()}
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="max-w-[140px] px-4 py-3 align-top text-neutral-700">{agencyLabel}</td>
                              <td className="max-w-[120px] px-4 py-3 align-top text-neutral-700">
                                {c.industry ?? "—"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 align-top tabular-nums">
                                <span className="font-semibold text-neutral-900">{c.adsLive}</span>
                                <span className="text-neutral-600"> live</span>
                                {c.adsTotal > 0 && <span className="text-neutral-600"> · {c.adsTotal} total</span>}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 align-top tabular-nums text-neutral-800">
                                {c.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </td>
                              <td className="px-4 py-3 align-top tabular-nums">{c.issues}</td>
                              <td className="px-4 py-3 align-top">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                                    c.health === "Critical"
                                      ? "bg-red-100 text-red-900"
                                      : c.health === "Warning"
                                        ? "bg-amber-100 text-amber-900"
                                        : "bg-emerald-100 text-emerald-900"
                                  }`}
                                >
                                  {c.health}
                                </span>
                              </td>
                              <td className="max-w-[180px] px-4 py-3 align-top text-xs text-neutral-700">
                                {platformSummary}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 align-top text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Link
                                    href={`/agency/clients/${c.id}`}
                                    className={buttonVariantStyles.secondary}
                                  >
                                    Open
                                  </Link>
                                  <Button
                                    type="button"
                                    className="!px-3 !py-1.5 text-xs"
                                    disabled={linkingId === c.id}
                                    onClick={() => void generateClientLink(c.id)}
                                  >
                                    {linkingId === c.id ? "…" : "Client link"}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                      </div>
                    </>
                  )}
                </>
              )}

              {view === "platform" && (
                <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-50 text-left text-xs font-bold uppercase text-neutral-600">
                      <tr>
                        <th className="px-4 py-3">Platform</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Spend</th>
                        <th className="px-4 py-3">CTR %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.byPlatform.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-neutral-600">
                            No platform data yet.
                          </td>
                        </tr>
                      ) : (
                        overview.byPlatform.map((row, i) => (
                          <tr key={`${row.platform}-${row.clientId}-${i}`} className="border-t border-neutral-100">
                            <td className="px-4 py-3 font-medium">{platformLabel(row.platform)}</td>
                            <td className="px-4 py-3">
                              <Link href={`/agency/clients/${row.clientId}`} className="font-semibold text-sky-800 hover:underline">
                                {row.clientName}
                              </Link>
                            </td>
                            <td className="px-4 py-3 tabular-nums">{row.spend.toLocaleString()}</td>
                            <td className="px-4 py-3 tabular-nums">{row.ctr.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Health &amp; analysis</h2>
        <p className="mt-1 text-xs text-neutral-600">Plan: {org.plan ?? "—"}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4">
            <p className="text-xs font-bold uppercase text-primary">Score</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-neutral-900">
              {score != null ? score : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 px-6 py-4">
            <p className="text-xs font-bold uppercase text-neutral-600">Label</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">{label ?? "—"}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" disabled={refreshing} onClick={() => void refreshScores()}>
            {refreshing ? "Refreshing…" : "Refresh scores"}
          </Button>
          <Button type="button" variant="secondary" disabled={running} onClick={() => void runAnalysis()}>
            {running ? "Running…" : "Run analysis"}
          </Button>
        </div>
        {runMessage && (
          <p className="mt-4 text-sm text-neutral-700">{runMessage}</p>
        )}
      </section>

      <AddClientModal
        open={addClientOpen}
        onClose={() => setAddClientOpen(false)}
        onCreated={() => void loadOverview()}
      />
    </div>
  );
}
