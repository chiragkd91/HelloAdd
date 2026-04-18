"use client";

import { TableSkeletonRows } from "@/components/ui/DataSkeletons";
import { useDashboardFilters } from "@/components/layout/DashboardFiltersContext";
import {
  formatImpressions,
  formatInr,
  formatShortDate,
  campaignHasError,
  platformLabel,
  statusLabel,
} from "@/lib/campaignDisplay";
import { useCampaigns } from "@/hooks/useCampaigns";
import Link from "next/link";
import { useMemo, useState } from "react";

function MiniCtrBar({ ctr }: { ctr: number }) {
  const w = Math.min(100, (ctr / 3) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-primary" style={{ width: `${w}%` }} />
      </div>
      <span className="text-xs tabular-nums text-neutral-600">{ctr.toFixed(2)}%</span>
    </div>
  );
}

export function CampaignTable() {
  const { platform: globalPlatform } = useDashboardFilters();
  const { campaigns, isLoading, error } = useCampaigns({
    limit: 80,
    platform: globalPlatform || undefined,
  });
  const [status, setStatus] = useState<string>("all");
  const [product, setProduct] = useState<string>("all");

  const products = useMemo(() => {
    const set = new Set<string>();
    for (const c of campaigns) {
      if (c.product) set.add(c.product);
    }
    return ["all", ...Array.from(set).sort()];
  }, [campaigns]);

  const rows = useMemo(() => {
    return campaigns.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (product !== "all" && (c.product ?? "") !== product) return false;
      return true;
    });
  }, [campaigns, status, product]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <h3 className="text-sm font-bold text-neutral-900">Campaigns</h3>
        {error && <p className="text-xs text-amber-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {globalPlatform ? (
            <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs font-medium text-neutral-700">
              {platformLabel(globalPlatform)}
            </span>
          ) : (
            <span className="rounded-lg border border-dashed border-neutral-200 px-2 py-1.5 text-xs text-neutral-600">
              All platforms
            </span>
          )}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs font-medium text-neutral-800"
          >
            <option value="all">All status</option>
            <option value="LIVE">Live</option>
            <option value="PAUSED">Paused</option>
            <option value="ENDED">Ended</option>
            <option value="DRAFT">Draft</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="hidden rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs font-medium text-neutral-800 md:inline-block"
            aria-label="Filter by product"
          >
            {products.map((p) => (
              <option key={p} value={p}>
                {p === "all" ? "All products" : p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="border-t border-neutral-100 md:hidden">
        {isLoading ? (
          <div className="p-4 text-sm text-neutral-600">Loading campaigns…</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-neutral-600">No campaigns. Run db:seed and refresh.</div>
        ) : (
          <div className="space-y-2 p-3">
            {rows.map((c) => (
              <div key={c.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/campaigns/${c.id}`} className="text-sm font-semibold text-primary hover:underline">
                    {c.name}
                  </Link>
                  <span className="text-[11px] text-neutral-600">{platformLabel(c.platform)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <MiniCtrBar ctr={c.ctr} />
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      c.status === "LIVE"
                        ? "bg-primary/15 text-primary"
                        : c.status === "PAUSED"
                          ? "bg-amber-100 text-amber-800"
                          : c.status === "ENDED"
                            ? "bg-neutral-200 text-neutral-700"
                            : "bg-sky-100 text-sky-900"
                    }`}
                  >
                    {statusLabel(c.status)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-600">
                  <span>{formatInr(c.budgetSpent)}</span>
                  <span>{formatImpressions(c.impressions)} impr.</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[520px] border-collapse text-left text-[11px] md:min-w-[900px] md:text-xs">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold uppercase tracking-wide text-neutral-600">
              <th className="px-3 py-3 md:px-4">Campaign</th>
              <th className="px-3 py-3 md:px-4">Platform</th>
              <th className="hidden px-4 py-3 md:table-cell">Product</th>
              <th className="hidden px-4 py-3 md:table-cell">Dates</th>
              <th className="hidden px-4 py-3 md:table-cell">Spend</th>
              <th className="hidden px-4 py-3 md:table-cell">Impr.</th>
              <th className="px-3 py-3 md:px-4">CTR</th>
              <th className="px-3 py-3 md:px-4">Status</th>
              <th className="px-3 py-3 md:px-4"> </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeletonRows
                rows={6}
                cols={9}
                getTdClassName={(ci) =>
                  [2, 3, 4, 5].includes(ci) ? "hidden md:table-cell px-4 py-3" : "px-3 py-3 md:px-4"
                }
              />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-neutral-600">
                  No campaigns. Run db:seed and refresh.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-neutral-100 transition-colors hover:bg-neutral-50/80"
                >
                  <td className="px-3 py-3 font-medium text-neutral-900 md:px-4">
                    <Link href={`/campaigns/${c.id}`} className="text-primary hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-neutral-700 md:px-4">{platformLabel(c.platform)}</td>
                  <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">{c.product ?? "—"}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-neutral-600 md:table-cell">
                    {formatShortDate(c.startDate)} → {c.endDate ? formatShortDate(c.endDate) : "—"}
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums text-neutral-800 md:table-cell">
                    {formatInr(c.budgetSpent)}
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums text-neutral-600 md:table-cell">
                    {formatImpressions(c.impressions)}
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    <MiniCtrBar ctr={c.ctr} />
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        c.status === "LIVE"
                          ? "bg-primary/15 text-primary"
                          : c.status === "PAUSED"
                            ? "bg-amber-100 text-amber-800"
                            : c.status === "ENDED"
                              ? "bg-neutral-200 text-neutral-700"
                              : "bg-sky-100 text-sky-900"
                      }`}
                    >
                      {statusLabel(c.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    {campaignHasError(c) ? (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700">
                        Error
                      </span>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
