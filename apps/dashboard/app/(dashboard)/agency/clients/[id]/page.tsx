"use client";

import { Button } from "@/components/ui/Button";
import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import { platformLabel, statusLabel } from "@/lib/campaignDisplay";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const TABS = [
  "Profile",
  "Platforms",
  "Campaigns",
  "Leads",
  "Billing",
  "History",
  "Team",
  "Notes",
] as const;

type DetailPayload = {
  agencyName: string | null;
  relation: {
    contractValue: number;
    contractCurrency: string;
    status: string;
    startDate: string;
    notes: string | null;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    tradeName: string | null;
    assignedAM: string | null;
    assignedCM: string | null;
    assignedAMUser: { id: string; name: string; email: string } | null;
    assignedCMUser: { id: string; name: string; email: string } | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    industry: string | null;
    logoUrl: string | null;
    plan: string;
    aiHealthScore: number | null;
    aiHealthLabel: string | null;
    createdAt: string;
  };
  metrics: {
    totalSpend: number;
    totalLeads: number;
    avgCTR: number;
    issueCount: number;
    alertCount: number;
    adsLive: number;
    adsPaused: number;
    adsEnded: number;
    adsDraft: number;
    adsTotal: number;
    platforms: Array<{ platform: string; spend: number; ctr: number }>;
  };
  campaigns: Array<{
    id: string;
    name: string;
    platform: string;
    status: string;
    budgetSpent: number;
    budgetTotal: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    errorType: string;
    startDate: string;
  }>;
};

type StaffRow = { userId: string; name: string; email: string; role: string };

type HistoryRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  isRead: boolean;
  createdAt: string;
};

function roleLabel(role: string): string {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    case "MANAGER":
      return "Manager";
    case "VIEWER":
      return "Viewer";
    default:
      return role;
  }
}

export default function AgencyClientDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [tab, setTab] = useState<(typeof TABS)[number]>("Profile");
  const [data, setData] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [agencyStaff, setAgencyStaff] = useState<StaffRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<StaffRow[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [assignAm, setAssignAm] = useState("");
  const [assignCm, setAssignCm] = useState("");
  const [patchSaving, setPatchSaving] = useState(false);
  const [profileTradeName, setProfileTradeName] = useState("");
  const [profileContactName, setProfileContactName] = useState("");
  const [profileContactPhone, setProfileContactPhone] = useState("");
  const [profileContactEmail, setProfileContactEmail] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/agency/clients/${id}`, { credentials: "include", cache: "no-store" });
      if (!r.ok) {
        setErr(r.status === 401 ? "Unauthorized" : "Could not load client");
        setData(null);
        return;
      }
      setData((await r.json()) as DetailPayload);
    } catch {
      setErr("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/organization/members", { credentials: "include", cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { members?: Array<{ userId: string; name: string; email: string; role: string }> };
        const rows = j.members ?? [];
        setAgencyStaff(
          rows.map((m) => ({ userId: m.userId, name: m.name, email: m.email, role: m.role })),
        );
      } catch {
        setAgencyStaff([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (tab !== "Team" || !id) return;
    setTeamLoading(true);
    void (async () => {
      try {
        const r = await fetch(`/api/agency/clients/${id}/members`, { credentials: "include", cache: "no-store" });
        if (!r.ok) {
          setTeamMembers([]);
          return;
        }
        const j = (await r.json()) as { members?: StaffRow[] };
        setTeamMembers(j.members ?? []);
      } catch {
        setTeamMembers([]);
      } finally {
        setTeamLoading(false);
      }
    })();
  }, [tab, id]);

  useEffect(() => {
    if (tab !== "History" || !id) return;
    setHistoryLoading(true);
    void (async () => {
      try {
        const r = await fetch(`/api/agency/clients/${id}/history`, { credentials: "include", cache: "no-store" });
        if (!r.ok) {
          setHistoryItems([]);
          return;
        }
        const j = (await r.json()) as { items?: HistoryRow[] };
        setHistoryItems(j.items ?? []);
      } catch {
        setHistoryItems([]);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [tab, id]);

  useEffect(() => {
    if (!data?.relation) return;
    setNotesDraft(data.relation.notes ?? "");
    setAssignAm(data.relation.assignedAM ?? "");
    setAssignCm(data.relation.assignedCM ?? "");
    setProfileTradeName(data.relation.tradeName ?? "");
    setProfileContactName(data.relation.contactName ?? "");
    setProfileContactPhone(data.relation.contactPhone ?? "");
    setProfileContactEmail(data.relation.contactEmail ?? "");
  }, [data]);

  async function patchRelation(body: Record<string, unknown>) {
    setPatchSaving(true);
    try {
      const r = await fetch(`/api/agency/clients/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not save");
        return;
      }
      toast.success("Saved");
      await load();
    } finally {
      setPatchSaving(false);
    }
  }

  async function portalLink() {
    setLinking(true);
    try {
      const r = await fetch(`/api/agency/clients/${id}/portal-link`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Failed");
        return;
      }
      if (j.url) {
        await navigator.clipboard.writeText(j.url);
        toast.success("Client portal link copied");
      }
    } finally {
      setLinking(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-48 animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-sm text-amber-950">
        {err ?? "Not found"}
        <div className="mt-4">
          <Link href="/agency" className={buttonVariantStyles.secondary}>
            Back to agency
          </Link>
        </div>
      </div>
    );
  }

  const { organization: org, relation, metrics, campaigns, agencyName } = data;

  const kpiClass =
    "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 text-xl font-bold text-neutral-600">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              org.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <Link href="/agency" className="text-sm font-semibold text-sky-800 hover:underline">
              ← Agency
            </Link>
            <h1 className="mt-1 text-[1.75rem] font-bold tracking-tight text-neutral-900">{org.name}</h1>
            {org.industry && <p className="mt-1 text-sm text-neutral-600">{org.industry}</p>}
            <p className="mt-1 text-xs text-neutral-600">
              Plan {org.plan} · Workspace since {new Date(org.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={linking} onClick={() => void portalLink()}>
            {linking ? "Working…" : "Generate client link"}
          </Button>
        </div>
      </div>

      <div className="-mx-1 flex flex-wrap items-center gap-2 overflow-x-auto overflow-y-hidden border-b border-neutral-200 px-1 pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              tab === t ? "bg-primary text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {t}
          </button>
        ))}
        <Link
          href={`/agency/clients/${id}/integrations`}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-primary ring-1 ring-primary/30 hover:bg-sky-50"
        >
          Integrations
        </Link>
      </div>

      {tab === "Profile" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Client profile</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Workspace ID <span className="font-mono text-neutral-700">{org.id}</span>
              {org.slug && (
                <>
                  {" "}
                  · slug <span className="font-mono">{org.slug}</span>
                </>
              )}
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase text-neutral-600">Managing agency</dt>
                <dd className="text-neutral-900">{agencyName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-neutral-600">Health</dt>
                <dd className="text-neutral-900">
                  {org.aiHealthLabel ?? "—"}{" "}
                  {org.aiHealthScore != null && (
                    <span className="text-neutral-600">({org.aiHealthScore})</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-neutral-600">Account manager</dt>
                <dd className="text-neutral-900">
                  {relation.assignedAMUser?.name ?? "—"}
                  {relation.assignedAMUser?.email ? (
                    <span className="text-neutral-600"> · {relation.assignedAMUser.email}</span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-neutral-600">Campaign manager</dt>
                <dd className="text-neutral-900">
                  {relation.assignedCMUser?.name ?? "—"}
                  {relation.assignedCMUser?.email ? (
                    <span className="text-neutral-600"> · {relation.assignedCMUser.email}</span>
                  ) : null}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold uppercase text-neutral-600">Relationship</dt>
                <dd className="text-neutral-900">
                  {relation.contractCurrency}{" "}
                  {relation.contractValue.toLocaleString("en-IN")} / mo · {relation.status} · since{" "}
                  {new Date(relation.startDate).toLocaleDateString("en-IN")}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Contact &amp; brand</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Stored on the agency–client relationship. Clear a field and save to remove it.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600 sm:col-span-2">
                Brand / trade name
                <input
                  value={profileTradeName}
                  onChange={(e) => setProfileTradeName(e.target.value)}
                  placeholder="Optional; can differ from workspace name above"
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Contact name
                <input
                  value={profileContactName}
                  onChange={(e) => setProfileContactName(e.target.value)}
                  placeholder="Primary contact person"
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Mobile
                <input
                  type="tel"
                  inputMode="tel"
                  value={profileContactPhone}
                  onChange={(e) => setProfileContactPhone(e.target.value)}
                  placeholder="+91 …"
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 tabular-nums"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600 sm:col-span-2">
                Email
                <input
                  type="email"
                  inputMode="email"
                  value={profileContactEmail}
                  onChange={(e) => setProfileContactEmail(e.target.value)}
                  placeholder="contact@client.com"
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                />
              </label>
            </div>
            <div className="mt-4">
              <Button
                type="button"
                disabled={patchSaving}
                onClick={() =>
                  void patchRelation({
                    tradeName: profileTradeName.trim() === "" ? null : profileTradeName.trim(),
                    contactName: profileContactName.trim() === "" ? null : profileContactName.trim(),
                    contactPhone: profileContactPhone.trim() === "" ? null : profileContactPhone.trim(),
                    contactEmail: profileContactEmail.trim() === "" ? null : profileContactEmail.trim(),
                  })
                }
              >
                {patchSaving ? "Saving…" : "Save contact & brand"}
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Assign agency owners</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Pick people from <strong>your agency workspace</strong> team. They must already be members of the agency org.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Account manager
                <select
                  value={assignAm}
                  onChange={(e) => setAssignAm(e.target.value)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="">— None —</option>
                  {agencyStaff.map((s) => (
                    <option key={s.userId} value={s.userId}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Campaign manager
                <select
                  value={assignCm}
                  onChange={(e) => setAssignCm(e.target.value)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="">— None —</option>
                  {agencyStaff.map((s) => (
                    <option key={s.userId} value={s.userId}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4">
              <Button
                type="button"
                disabled={patchSaving}
                onClick={() =>
                  void patchRelation({
                    assignedAM: assignAm === "" ? null : assignAm,
                    assignedCM: assignCm === "" ? null : assignCm,
                  })
                }
              >
                {patchSaving ? "Saving…" : "Save assignments"}
              </Button>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold text-neutral-900">Performance snapshot</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className={kpiClass}>
                <p className="text-xs font-bold uppercase text-neutral-600">Ads running</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{metrics.adsLive}</p>
                <p className="mt-1 text-xs text-neutral-600">Live campaigns</p>
              </div>
              <div className={kpiClass}>
                <p className="text-xs font-bold uppercase text-neutral-600">Paused</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">{metrics.adsPaused}</p>
              </div>
              <div className={kpiClass}>
                <p className="text-xs font-bold uppercase text-neutral-600">Total campaigns</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">{metrics.adsTotal}</p>
                <p className="mt-1 text-xs text-neutral-600">
                  {metrics.adsEnded} ended · {metrics.adsDraft} draft
                </p>
              </div>
              <div className={kpiClass}>
                <p className="text-xs font-bold uppercase text-neutral-600">Spend (total)</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
                  ₹{metrics.totalSpend.toLocaleString("en-IN")}
                </p>
              </div>
              <div className={kpiClass}>
                <p className="text-xs font-bold uppercase text-neutral-600">Avg CTR</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
                  {metrics.avgCTR.toFixed(2)}%
                </p>
              </div>
              <div className={kpiClass}>
                <p className="text-xs font-bold uppercase text-neutral-600">Leads (conversions)</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">{metrics.totalLeads}</p>
              </div>
              <div className={kpiClass}>
                <p className="text-xs font-bold uppercase text-neutral-600">Open alerts</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-amber-800">{metrics.alertCount}</p>
              </div>
              <div className={kpiClass}>
                <p className="text-xs font-bold uppercase text-neutral-600">Campaign issues</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">{metrics.issueCount}</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "Platforms" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Platforms</h2>
          <p className="mt-1 text-xs text-neutral-600">Spend and CTR by ad platform for this client.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-bold uppercase text-neutral-600">
                <tr>
                  <th className="px-3 py-2">Platform</th>
                  <th className="px-3 py-2">Spend</th>
                  <th className="px-3 py-2">CTR %</th>
                </tr>
              </thead>
              <tbody>
                {metrics.platforms.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-neutral-600">
                      No campaign data yet. Connect integrations and sync campaigns for this workspace.
                    </td>
                  </tr>
                ) : (
                  metrics.platforms.map((p) => (
                    <tr key={p.platform} className="border-t border-neutral-100">
                      <td className="px-3 py-2 font-medium">{platformLabel(p.platform)}</td>
                      <td className="px-3 py-2 tabular-nums">₹{p.spend.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 tabular-nums">{p.ctr.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "Campaigns" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Campaigns</h2>
          <p className="mt-1 text-xs text-neutral-600">
            All campaigns in this client workspace — {metrics.adsLive} live, {metrics.adsPaused} paused.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-bold uppercase text-neutral-600">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Platform</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Spend</th>
                  <th className="px-3 py-2">CTR %</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-neutral-600">
                      No campaigns yet.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.id} className="border-t border-neutral-100">
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2">{platformLabel(c.platform)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            c.status === "LIVE"
                              ? "font-semibold text-primary"
                              : "text-neutral-700"
                          }
                        >
                          {statusLabel(c.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {c.budgetSpent.toLocaleString("en-IN")} / {c.budgetTotal.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{c.ctr.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "Leads" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Leads</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Total conversions (all campaigns):{" "}
            <strong className="text-neutral-900">{metrics.totalLeads}</strong>
          </p>
          <p className="mt-2 text-xs text-neutral-600">Open alerts: {metrics.alertCount}</p>
        </section>
      )}

      {tab === "Billing" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Billing</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase text-neutral-600">Contract</dt>
              <dd className="text-neutral-900">
                {relation.contractCurrency} {relation.contractValue.toLocaleString("en-IN")} / mo ·{" "}
                {relation.status}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-neutral-600">Started</dt>
              <dd className="text-neutral-900">{new Date(relation.startDate).toLocaleDateString("en-IN")}</dd>
            </div>
          </dl>
        </section>
      )}

      {tab === "History" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Alerts &amp; history</h2>
          <p className="mt-1 text-xs text-neutral-600">
            Recent alerts for this client workspace (newest first).
          </p>
          {historyLoading ? (
            <p className="mt-4 text-sm text-neutral-600">Loading…</p>
          ) : historyItems.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-600">No alerts recorded yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs font-bold uppercase text-neutral-600">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {historyItems.map((h) => (
                    <tr key={h.id} className="border-t border-neutral-100">
                      <td className="whitespace-nowrap px-3 py-2 text-neutral-600">
                        {new Date(h.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-800">
                          {h.severity}
                        </span>
                      </td>
                      <td className="max-w-[200px] px-3 py-2 font-medium text-neutral-900">{h.title}</td>
                      <td className="max-w-md px-3 py-2 text-neutral-600">{h.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "Team" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Client workspace team</h2>
          <p className="mt-1 text-xs text-neutral-600">
            People invited to this client&apos;s organization. Manage invites from{" "}
            <Link href="/team" className="font-semibold text-sky-800 hover:underline">
              Team
            </Link>{" "}
            while this workspace is selected.
          </p>
          {teamLoading ? (
            <p className="mt-4 text-sm text-neutral-600">Loading…</p>
          ) : teamMembers.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-600">
              No members yet. Invite users to this client workspace from Team → Invite.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs font-bold uppercase text-neutral-600">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((m) => (
                    <tr key={m.userId} className="border-t border-neutral-100">
                      <td className="px-3 py-2 font-medium text-neutral-900">{m.name}</td>
                      <td className="px-3 py-2 text-neutral-600">{m.email}</td>
                      <td className="px-3 py-2 tabular-nums">{roleLabel(m.role)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "Notes" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Internal notes</h2>
          <p className="mt-1 text-xs text-neutral-600">Visible to your agency team on this client record.</p>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={8}
            className="mt-4 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
            placeholder="Retainer, contacts, context…"
          />
          <div className="mt-3">
            <Button
              type="button"
              disabled={patchSaving}
              onClick={() => void patchRelation({ notes: notesDraft.trim() === "" ? null : notesDraft })}
            >
              {patchSaving ? "Saving…" : "Save notes"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
