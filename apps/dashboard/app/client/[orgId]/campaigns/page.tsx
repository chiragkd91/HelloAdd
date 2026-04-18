"use client";

import { ClientPortalChrome } from "@/components/clientPortal/ClientPortalChrome";
import { formatInr, platformLabel, statusLabel } from "@/lib/campaignDisplay";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function ClientCampaignsPage() {
  const params = useParams();
  const orgId = typeof params.orgId === "string" ? params.orgId : "";
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<
    Array<{
      id: string;
      name: string;
      platform: string;
      status: string;
      budgetSpent: number;
      budgetTotal: number;
      impressions: number;
      clicks: number;
      ctr: number;
      conversions: number;
    }>
  >([]);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/client/campaigns?orgId=${encodeURIComponent(orgId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) {
        setErr(
          r.status === 403
            ? "This section is not available — your agency may have turned it off."
            : "Could not load campaigns.",
        );
        setRows([]);
        return;
      }
      const j = (await r.json()) as { campaigns: typeof rows };
      setRows(j.campaigns ?? []);
    } catch {
      setErr("Network error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ClientPortalChrome orgId={orgId} activeSection="campaigns">
      <h1 className="text-xl font-bold text-neutral-900">Campaigns</h1>
      <p className="mt-1 text-sm text-neutral-500">Read-only — contact your agency to make changes.</p>
      {loading && <p className="mt-6 text-sm text-neutral-500">Loading…</p>}
      {err && (
        <p className="mt-6 text-sm text-amber-800">{err}</p>
      )}
      {!loading && !err && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="min-w-[520px] w-full text-[11px] md:min-w-full md:text-sm">
            <thead className="bg-neutral-50 text-left text-[11px] font-bold uppercase text-neutral-500 md:text-xs">
              <tr>
                <th className="px-3 py-3">Campaign</th>
                <th className="px-3 py-3">Platform</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Spend</th>
                <th className="hidden px-3 py-3 md:table-cell">Impr.</th>
                <th className="px-3 py-3">CTR %</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-neutral-500">
                    No campaigns yet.
                  </td>
                </tr>
              ) : (
                               rows.map((c) => (
                  <tr key={c.id} className="border-t border-neutral-100">
                    <td className="px-3 py-3 font-medium text-neutral-900">{c.name}</td>
                    <td className="px-3 py-3 text-neutral-700">{platformLabel(c.platform)}</td>
                    <td className="px-3 py-3 text-neutral-700">{statusLabel(c.status)}</td>
                    <td className="px-3 py-3 tabular-nums text-neutral-800">
                      {formatInr(c.budgetSpent)} / {formatInr(c.budgetTotal)}
                    </td>
                    <td className="hidden px-3 py-3 tabular-nums text-neutral-600 md:table-cell">
                      {c.impressions.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{c.ctr.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </ClientPortalChrome>
  );
}
