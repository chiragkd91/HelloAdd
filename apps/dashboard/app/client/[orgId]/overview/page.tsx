"use client";

import { ClientPortalChrome } from "@/components/clientPortal/ClientPortalChrome";
import { platformLabel } from "@/lib/campaignDisplay";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type OverviewPayload = {
  organization: { name: string; industry: string | null };
  metrics: {
    totalSpend: number;
    totalLeads: number;
    avgCTR: number;
    issueCount: number;
    openAlerts: number;
  };
  platforms: Array<{ platform: string; spend: number; ctr: number }>;
};

export default function ClientOverviewPage() {
  const params = useParams();
  const orgId = typeof params.orgId === "string" ? params.orgId : "";
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<OverviewPayload | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/client/overview?orgId=${encodeURIComponent(orgId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) {
        setErr(
          r.status === 401
            ? "Session expired — open your portal link again."
            : r.status === 403
              ? "This section is not available — your agency may have turned it off."
              : "Could not load data.",
        );
        setData(null);
        return;
      }
      setData((await r.json()) as OverviewPayload);
    } catch {
      setErr("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ClientPortalChrome orgId={orgId} activeSection="overview">
      {loading && <p className="text-sm text-neutral-500">Loading…</p>}
      {err && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {err}
        </div>
      )}
      {data && !loading && (
        <div className="space-y-8">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">{data.organization.name}</h1>
            {data.organization.industry && (
              <p className="mt-1 text-sm text-neutral-500">{data.organization.industry}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Spend (tracked)", value: data.metrics.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
              { label: "Leads / conversions", value: String(data.metrics.totalLeads) },
              { label: "Avg CTR %", value: data.metrics.avgCTR.toFixed(2) },
              { label: "Open alerts", value: String(data.metrics.openAlerts) },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase text-neutral-500">{k.label}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900">{k.value}</p>
              </div>
            ))}
          </div>
          <section>
            <h2 className="text-sm font-bold text-neutral-900">Platforms</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs font-bold uppercase text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Platform</th>
                    <th className="px-4 py-3">Spend</th>
                    <th className="px-4 py-3">CTR %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.platforms.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                        No campaign data yet.
                      </td>
                    </tr>
                  ) : (
                    data.platforms.map((p) => (
                      <tr key={p.platform} className="border-t border-neutral-100">
                        <td className="px-4 py-3 font-medium">{platformLabel(p.platform)}</td>
                        <td className="px-4 py-3 tabular-nums">{p.spend.toLocaleString()}</td>
                        <td className="px-4 py-3 tabular-nums">{p.ctr.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </ClientPortalChrome>
  );
}
