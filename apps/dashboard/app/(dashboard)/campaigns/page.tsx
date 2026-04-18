"use client";

import { TableSkeletonRows } from "@/components/ui/DataSkeletons";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { CampaignsFilters } from "@/components/dashboard/CampaignsFilters";
import { useDashboardFilters } from "@/components/layout/DashboardFiltersContext";
import {
  formatImpressions,
  formatInr,
  formatShortDate,
  platformLabel,
  statusLabel,
  campaignHasError,
} from "@/lib/campaignDisplay";
import { useCampaigns } from "@/hooks/useCampaigns";
import type { ApiCampaign } from "@/types/campaign";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 20;

type ApiIntegration = {
  id: string;
  platform: string;
  accountName: string;
  isActive: boolean;
};

const SORT_KEYS = [
  "name",
  "platform",
  "product",
  "startDate",
  "spend",
  "impressions",
  "ctr",
  "status",
] as const;
type SortKey = (typeof SORT_KEYS)[number];

function compareCampaigns(a: ApiCampaign, b: ApiCampaign, key: SortKey, dir: "asc" | "desc"): number {
  const mult = dir === "asc" ? 1 : -1;
  switch (key) {
    case "name":
      return mult * a.name.localeCompare(b.name);
    case "platform":
      return mult * a.platform.localeCompare(b.platform);
    case "product":
      return mult * (a.product ?? "").localeCompare(b.product ?? "");
    case "startDate":
      return mult * (new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    case "spend":
      return mult * (a.budgetSpent - b.budgetSpent);
    case "impressions":
      return mult * (a.impressions - b.impressions);
    case "ctr":
      return mult * (a.ctr - b.ctr);
    case "status":
      return mult * a.status.localeCompare(b.status);
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCampaignsCsv(rows: ApiCampaign[], filenameSuffix: string) {
  const headers = [
    "id",
    "name",
    "platform",
    "product",
    "status",
    "startDate",
    "endDate",
    "budgetTotal",
    "budgetSpent",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
  ];
  const lines = [headers.join(",")];
  for (const c of rows) {
    const row = [
      c.id,
      c.name,
      c.platform,
      c.product ?? "",
      c.status,
      c.startDate,
      c.endDate ?? "",
      String(c.budgetTotal),
      String(c.budgetSpent),
      String(c.impressions),
      String(c.clicks),
      String(c.ctr),
      String(c.cpc),
    ].map((v) => escapeCsvCell(v));
    lines.push(row.join(","));
  }
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `campaigns-${filenameSuffix}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function SortTh({
  label,
  sortKey,
  current,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current: { key: SortKey; dir: "asc" | "desc" };
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current.key === sortKey;
  const arrow = active ? (current.dir === "asc" ? "↑" : "↓") : "↕";
  return (
    <th
      className={`px-3 py-3 ${className ?? ""}`}
      aria-sort={active ? (current.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 font-bold uppercase tracking-wide text-neutral-600 hover:text-neutral-800"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <span className={active ? "text-primary" : "text-neutral-600"} aria-hidden>
          {arrow}
        </span>
      </button>
    </th>
  );
}

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

function CampaignsPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { platform: globalPlatform, setRangeDays } = useDashboardFilters();
  const { campaigns, total, isLoading, error, refresh } = useCampaigns({
    limit: 200,
    platform: globalPlatform || undefined,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [product, setProduct] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newOpen, setNewOpen] = useState(false);
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [pauseRunning, setPauseRunning] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "startDate",
    dir: "desc",
  });

  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [newIntegrationId, setNewIntegrationId] = useState("");
  const [newName, setNewName] = useState("");
  const [newExternalId, setNewExternalId] = useState("");
  const [newProduct, setNewProduct] = useState("");
  const [newStatus, setNewStatus] = useState<"DRAFT" | "LIVE">("DRAFT");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newBudgetTotal, setNewBudgetTotal] = useState("10000");

  useEffect(() => {
    const q = sp.get("q");
    if (q) setSearch(q);
  }, [sp]);

  const products = useMemo(() => {
    const set = new Set<string>();
    for (const c of campaigns) {
      if (c.product) set.add(c.product);
    }
    return ["all", ...Array.from(set).sort()];
  }, [campaigns]);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (status !== "all" && c.status !== status) return false;
      if (product !== "all" && (c.product ?? "") !== product) return false;
      return true;
    });
  }, [campaigns, search, status, product]);

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => compareCampaigns(a, b, sort.key, sort.dir));
    return arr;
  }, [filtered, sort.key, sort.dir]);

  const handleSort = useCallback((key: SortKey) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : {
            key,
            dir: ["name", "platform", "product", "status"].includes(key) ? "asc" : "desc",
          },
    );
  }, []);

  const liveInSelection = useMemo(
    () => campaigns.filter((c) => selected.has(c.id) && c.status === "LIVE"),
    [campaigns, selected],
  );

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = sortedFiltered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  useEffect(() => {
    if (!newOpen) return;
    setNewName("");
    setNewProduct("");
    setNewEndDate("");
    setNewBudgetTotal("10000");
    setNewStatus("DRAFT");
    setNewIntegrationId("");
    const today = new Date().toISOString().slice(0, 10);
    setNewStartDate(today);
    setNewExternalId(`manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

    let cancelled = false;
    setIntegrationsLoading(true);
    fetch("/api/integrations", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load integrations");
        const j = (await r.json()) as { items?: ApiIntegration[] };
        const items = (j.items ?? []).filter((i) => i.platform !== "WHATSAPP");
        if (!cancelled) setIntegrations(items);
      })
      .catch(() => {
        if (!cancelled) {
          setIntegrations([]);
          toast.error("Could not load integrations.");
        }
      })
      .finally(() => {
        if (!cancelled) setIntegrationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [newOpen]);

  async function runBulkPause() {
    if (liveInSelection.length === 0) {
      toast.error("No live campaigns in the current selection.");
      setPauseConfirmOpen(false);
      return;
    }
    setPauseRunning(true);
    let ok = 0;
    let failed = 0;
    for (const c of liveInSelection) {
      try {
        const r = await fetch(`/api/campaigns/${c.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PAUSED" }),
        });
        if (r.ok) ok++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setPauseRunning(false);
    setPauseConfirmOpen(false);
    setSelected(new Set());
    await refresh();
    if (failed === 0) toast.success(`Paused ${ok} campaign(s).`);
    else toast.success(`Paused ${ok} campaign(s); ${failed} could not be updated.`);
  }

  function handleExportCsv() {
    const rows =
      selected.size > 0
        ? sortedFiltered.filter((c) => selected.has(c.id))
        : sortedFiltered;
    if (rows.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    downloadCampaignsCsv(rows, new Date().toISOString().slice(0, 10));
    toast.success(`Exported ${rows.length} row(s).`);
  }

  async function submitNewCampaign(e: React.FormEvent) {
    e.preventDefault();
    const int = integrations.find((i) => i.id === newIntegrationId);
    if (!int) {
      toast.error("Select an ad account integration.");
      return;
    }
    if (!int.isActive) {
      toast.error("Selected integration is inactive.");
      return;
    }
    const name = newName.trim();
    if (!name) {
      toast.error("Campaign name is required.");
      return;
    }
    const ext = newExternalId.trim();
    if (!ext) {
      toast.error("External ID is required.");
      return;
    }
    const budget = Number(newBudgetTotal);
    if (!Number.isFinite(budget) || budget < 0) {
      toast.error("Budget must be a valid non-negative number.");
      return;
    }
    setCreateSubmitting(true);
    try {
      const r = await fetch("/api/campaigns", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId: int.id,
          externalId: ext,
          name,
          platform: int.platform,
          product: newProduct.trim() || null,
          status: newStatus,
          startDate: newStartDate ? new Date(newStartDate).toISOString() : new Date().toISOString(),
          endDate: newEndDate.trim() ? new Date(newEndDate).toISOString() : null,
          budgetTotal: budget,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: unknown; id?: string };
      if (!r.ok) {
        const err =
          j && typeof j === "object" && "error" in j && typeof j.error === "string"
            ? j.error
            : "Could not create campaign.";
        toast.error(err);
        return;
      }
      const created = j as ApiCampaign;
      toast.success("Campaign created.");
      setNewOpen(false);
      await refresh();
      if (created.id) router.push(`/campaigns/${created.id}`);
    } catch {
      toast.error("Network error.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAllOnPage() {
    const ids = slice.map((c) => c.id);
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const n = new Set(prev);
      if (allSelected) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Campaigns</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Search, filter, and manage campaigns from MongoDB ({total} in workspace
            {globalPlatform ? `, ${platformLabel(globalPlatform)} only` : ""}).
          </p>
        </div>
        <Button type="button" onClick={() => setNewOpen(true)}>
          New Campaign
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error}
          <button type="button" className="ml-2 font-semibold text-primary underline" onClick={() => refresh()}>
            Retry
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
        <CampaignsFilters
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          status={status}
          onStatusChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          product={product}
          onProductChange={(v) => {
            setProduct(v);
            setPage(1);
          }}
          productOptions={products}
          onClearAll={() => {
            setSearch("");
            setStatus("all");
            setProduct("all");
            setRangeDays(30);
            setPage(1);
          }}
        />

        <div className="mt-3 flex flex-col gap-2 border-t border-neutral-100 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={selected.size === 0 || liveInSelection.length === 0}
              onClick={() => setPauseConfirmOpen(true)}
              title={
                selected.size === 0
                  ? "Select campaigns in the table"
                  : liveInSelection.length === 0
                    ? "Only campaigns with status Live can be paused in bulk"
                    : undefined
              }
            >
              Pause live in selection ({liveInSelection.length}
              {selected.size > 0 ? ` / ${selected.size} selected` : ""})
            </Button>
            <Button type="button" variant="secondary" onClick={handleExportCsv}>
              Export CSV
            </Button>
          </div>
          <p className="text-xs text-neutral-600">
            Export uses <strong className="font-medium text-neutral-700">selected rows</strong> when any are checked;
            otherwise it exports <strong className="font-medium text-neutral-700">all rows in the current filter</strong>
            ({sortedFiltered.length}).
          </p>
        </div>

        <ConfirmModal
          isOpen={pauseConfirmOpen}
          title="Pause live campaigns?"
          message={
            liveInSelection.length === 0
              ? "No live campaigns are selected. Choose rows with status Live, or pause from a campaign detail page."
              : `This will set status to Paused for ${liveInSelection.length} live campaign(s). Draft, paused, and ended rows in the selection are skipped.`
          }
          confirmLabel="Pause now"
          cancelLabel="Cancel"
          variant="warning"
          isLoading={pauseRunning}
          onConfirm={runBulkPause}
          onCancel={() => !pauseRunning && setPauseConfirmOpen(false)}
        />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[520px] border-collapse text-left text-[11px] md:min-w-[960px] md:text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] uppercase tracking-wide">
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={slice.length > 0 && slice.every((c) => selected.has(c.id))}
                    onChange={toggleAllOnPage}
                  />
                </th>
                <SortTh label="Campaign" sortKey="name" current={sort} onSort={handleSort} />
                <SortTh label="Platform" sortKey="platform" current={sort} onSort={handleSort} />
                <SortTh
                  label="Product"
                  sortKey="product"
                  current={sort}
                  onSort={handleSort}
                  className="hidden md:table-cell"
                />
                <SortTh
                  label="Dates"
                  sortKey="startDate"
                  current={sort}
                  onSort={handleSort}
                  className="hidden md:table-cell"
                />
                <SortTh
                  label="Spend"
                  sortKey="spend"
                  current={sort}
                  onSort={handleSort}
                  className="hidden md:table-cell"
                />
                <SortTh
                  label="Impr."
                  sortKey="impressions"
                  current={sort}
                  onSort={handleSort}
                  className="hidden md:table-cell"
                />
                <SortTh label="CTR" sortKey="ctr" current={sort} onSort={handleSort} />
                <SortTh label="Status" sortKey="status" current={sort} onSort={handleSort} />
                <th className="px-3 py-3 font-bold text-neutral-600"> </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeletonRows
                  rows={8}
                  cols={10}
                  tdClassName="px-3 py-3"
                  getTdClassName={(ci) =>
                    [3, 4, 5, 6].includes(ci) ? "hidden md:table-cell px-3 py-3" : undefined
                  }
                />
              ) : slice.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center text-sm text-neutral-600">
                    No campaigns match your filters.
                    {campaigns.length === 0 && (
                        <span className="mt-2 block text-xs text-neutral-600">
                        Seed sample data: run <code className="rounded bg-neutral-100 px-1">npm run db:seed</code> from
                        the monorepo root, then refresh.
                      </span>
                    )}
                  </td>
                </tr>
              ) : (
                slice.map((c) => (
                  <tr key={c.id} className="border-b border-neutral-100 hover:bg-neutral-50/80">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleRow(c.id)}
                        aria-label={`Select ${c.name}`}
                      />
                    </td>
                    <td className="px-3 py-3 font-medium text-neutral-900">
                      <Link href={`/campaigns/${c.id}`} className="text-primary hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-neutral-700">{platformLabel(c.platform)}</td>
                    <td className="hidden px-3 py-3 text-neutral-600 md:table-cell">{c.product ?? "—"}</td>
                    <td className="hidden whitespace-nowrap px-3 py-3 text-neutral-600 md:table-cell">
                      {formatShortDate(c.startDate)} → {c.endDate ? formatShortDate(c.endDate) : "—"}
                    </td>
                    <td className="hidden px-3 py-3 tabular-nums text-neutral-800 md:table-cell">
                      {formatInr(c.budgetSpent)}
                    </td>
                    <td className="hidden px-3 py-3 tabular-nums text-neutral-600 md:table-cell">
                      {formatImpressions(c.impressions)}
                    </td>
                    <td className="px-3 py-3">
                      <MiniCtrBar ctr={c.ctr} />
                    </td>
                    <td className="px-3 py-3">
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
                    <td className="px-3 py-3">
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3 text-sm text-neutral-600">
          <p>
            Showing{" "}
            {sortedFiltered.length === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1}
            –
            {Math.min(pageSafe * PAGE_SIZE, sortedFiltered.length)} of {sortedFiltered.length}
            {sortedFiltered.length !== total ? ` (filtered from ${total})` : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-neutral-200 px-3 py-1.5 font-medium hover:bg-neutral-50 disabled:opacity-40"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="text-xs text-neutral-600">
              Page {pageSafe} / {totalPages}
            </span>
            <button
              type="button"
              className="rounded-lg border border-neutral-200 px-3 py-1.5 font-medium hover:bg-neutral-50 disabled:opacity-40"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal open={newOpen} onClose={() => !createSubmitting && setNewOpen(false)} title="New campaign">
        {integrationsLoading ? (
          <p className="text-sm text-neutral-600">Loading ad accounts…</p>
        ) : integrations.length === 0 ? (
          <div className="space-y-3 text-sm text-neutral-600">
            <p>Connect an ad account first, then create a campaign tied to that integration.</p>
            <Link
              href="/integrations"
              className="font-medium text-primary underline"
              onClick={() => setNewOpen(false)}
            >
              Go to Integrations
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submitNewCampaign}>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Ad account
              <select
                required
                value={newIntegrationId}
                onChange={(e) => setNewIntegrationId(e.target.value)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
              >
                <option value="">Choose integration…</option>
                {integrations.map((i) => (
                  <option key={i.id} value={i.id} disabled={!i.isActive}>
                    {i.accountName} ({platformLabel(i.platform)}
                    {!i.isActive ? " — inactive" : ""})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Campaign name
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                placeholder="Spring push"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              External ID
              <input
                required
                value={newExternalId}
                onChange={(e) => setNewExternalId(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm text-neutral-900"
                title="Unique id in your ad platform or a manual placeholder"
              />
              <span className="font-normal text-neutral-600">Must be unique; edit if the default collides.</span>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Product (optional)
              <input
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Status
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as "DRAFT" | "LIVE")}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="LIVE">Live</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Budget total (INR)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={newBudgetTotal}
                  onChange={(e) => setNewBudgetTotal(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm tabular-nums text-neutral-900"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Start date
                <input
                  type="date"
                  required
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                End date (optional)
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" disabled={createSubmitting} onClick={() => setNewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? "Creating…" : "Create campaign"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-neutral-600" aria-live="polite">
          Loading campaigns…
        </div>
      }
    >
      <CampaignsPageInner />
    </Suspense>
  );
}
