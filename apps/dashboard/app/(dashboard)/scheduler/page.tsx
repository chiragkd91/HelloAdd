"use client";

import {
  SchedulerFilters,
  type SchedulerStatusFilter,
} from "@/components/dashboard/SchedulerFilters";
import { Button } from "@/components/ui/Button";
import { platformLabel } from "@/lib/campaignDisplay";
import { PlatformValues } from "@helloadd/database";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;
const SCHEDULER_PLATFORM_OPTIONS = ["ALL", ...(PlatformValues as readonly string[])];

type PostPlatformStatus = {
  platform: string;
  status: "SCHEDULED" | "PUBLISHED" | "FAILED" | "DRAFT";
  scheduledAt: string;
  publishedAt: string | null;
  errorMessage: string | null;
};

type ScheduledPostItem = {
  id: string;
  content: string;
  mediaUrls: string[];
  platforms: PostPlatformStatus[];
  campaignId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

function statusBadgeClass(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "bg-emerald-100 text-emerald-800";
    case "FAILED":
      return "bg-red-100 text-red-700";
    case "SCHEDULED":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

export default function SchedulerListPage() {
  const [items, setItems] = useState<ScheduledPostItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SchedulerStatusFilter>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduledPostItem | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [bulkRescheduleAt, setBulkRescheduleAt] = useState("");
  const [bulkRescheduleOpen, setBulkRescheduleOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, platformFilter, debouncedSearch]);

  useEffect(() => {
    setSelectedIds([]);
  }, [page]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * PAGE_SIZE;
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("skip", String(skip));
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (platformFilter !== "ALL") params.set("platform", platformFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/posts?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as {
        items?: ScheduledPostItem[];
        total?: number;
        error?: string;
      };
      if (!res.ok) {
        toast.error(body.error ?? "Failed to load scheduled posts");
        setItems([]);
        setTotal(0);
        return;
      }
      const totalCount = body.total ?? 0;
      setTotal(totalCount);
      setItems(body.items ?? []);
      const lastPage = Math.max(1, Math.ceil(totalCount / PAGE_SIZE) || 1);
      if (totalCount > 0 && page > lastPage) {
        setPage(lastPage);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, platformFilter, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleSelected(postId: string) {
    setSelectedIds((prev) => (prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]));
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await fetch(`/api/posts/${id}`, { method: "DELETE", credentials: "include" });
    }
    toast.success("Selected posts deleted");
    setSelectedIds([]);
    await load();
  }

  async function publishNow(id: string) {
    const res = await fetch(`/api/posts/${id}/publish-now`, { method: "POST", credentials: "include" });
    if (!res.ok) {
      toast.error("Publish failed");
      return;
    }
    toast.success("Publish triggered");
    await load();
  }

  async function reschedulePost() {
    if (!rescheduleTarget || !rescheduleAt) return;
    const body = {
      platforms: rescheduleTarget.platforms.map((p) => ({
        platform: p.platform,
        status: "SCHEDULED",
        scheduledAt: new Date(rescheduleAt).toISOString(),
      })),
    };
    const res = await fetch(`/api/posts/${rescheduleTarget.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("Reschedule failed");
      return;
    }
    toast.success("Post rescheduled");
    setRescheduleTarget(null);
    setRescheduleAt("");
    await load();
  }

  async function rescheduleSelected() {
    if (!bulkRescheduleAt || selectedIds.length === 0) return;
    let ok = 0;
    for (const id of selectedIds) {
      const target = items.find((i) => i.id === id);
      if (!target) continue;
      const body = {
        platforms: target.platforms.map((p) => ({
          platform: p.platform,
          status: "SCHEDULED",
          scheduledAt: new Date(bulkRescheduleAt).toISOString(),
        })),
      };
      const res = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) ok += 1;
    }
    toast.success(`${ok} post(s) rescheduled`);
    setBulkRescheduleOpen(false);
    setBulkRescheduleAt("");
    setSelectedIds([]);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Scheduler</h1>
        <p className="mt-1 text-sm text-neutral-600">Manage scheduled, published, failed, and draft posts.</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
        <SchedulerFilters
          status={statusFilter}
          onStatusChange={setStatusFilter}
          platform={platformFilter}
          onPlatformChange={setPlatformFilter}
          platformOptions={SCHEDULER_PLATFORM_OPTIONS}
          search={search}
          onSearchChange={setSearch}
          onClearAll={() => {
            setStatusFilter("ALL");
            setPlatformFilter("ALL");
            setSearch("");
            setPage(1);
          }}
          trailing={
            <>
              <Link
                href="/calendar"
                className="inline-flex h-[42px] items-center rounded-xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Open calendar
              </Link>
              <Link
                href="/scheduler/create"
                className="inline-flex h-[42px] items-center rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover"
              >
                New Post
              </Link>
            </>
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          {total === 0
            ? "0 post(s)"
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} post(s)`}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => void deleteSelected()} disabled={selectedIds.length === 0}>
            Delete selected
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setBulkRescheduleAt(new Date().toISOString().slice(0, 16));
              setBulkRescheduleOpen(true);
            }}
            disabled={selectedIds.length === 0}
          >
            Reschedule selected
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-600">
            <tr>
              <th className="px-3 py-3">Select</th>
              <th className="px-3 py-3">Content</th>
              <th className="px-3 py-3">Platforms</th>
              <th className="px-3 py-3">Scheduled At</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-4 text-neutral-600" colSpan={6}>
                  Loading scheduled posts...
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-neutral-600" colSpan={6}>
                  No posts found for current filters.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((item) => {
                const platforms = item.platforms;
                const statusSet = new Set(platforms.map((p) => p.status));
                const uniformStatus = statusSet.size === 1 ? (platforms[0]?.status ?? "DRAFT") : null;
                const anyScheduled = platforms.some((p) => p.status === "SCHEDULED");
                const anyEditable = platforms.some(
                  (p) => p.status === "SCHEDULED" || p.status === "FAILED" || p.status === "DRAFT",
                );
                const canDelete = !platforms.some((p) => p.status === "PUBLISHED");
                const mixedTitle = platforms.map((p) => `${platformLabel(p.platform)}: ${p.status}`).join(" · ");

                return (
                  <tr key={item.id} className="border-b border-neutral-100 align-top">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelected(item.id)}
                      />
                    </td>
                    <td className="max-w-[420px] px-3 py-3 text-neutral-900">
                      <Link
                        href={`/scheduler/${item.id}`}
                        className="line-clamp-2 font-medium text-primary hover:underline"
                      >
                        {item.content}
                      </Link>
                    </td>
                    <td className="min-w-[9rem] px-3 py-3">
                      {platforms.length === 0 ? (
                        <span className="text-xs text-neutral-600">—</span>
                      ) : (
                        <ul className="space-y-1.5">
                          {platforms.map((p) => (
                            <li key={`${item.id}-${p.platform}`} className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold text-neutral-800">{platformLabel(p.platform)}</span>
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${statusBadgeClass(p.status)}`}
                              >
                                {p.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="min-w-[11rem] px-3 py-3">
                      {platforms.length === 0 ? (
                        <span className="text-xs text-neutral-600">—</span>
                      ) : (
                        <ul className="space-y-1 text-xs tabular-nums text-neutral-700">
                          {platforms.map((p) => (
                            <li key={`${item.id}-${p.platform}-time`}>
                              <span className="text-neutral-600">{platformLabel(p.platform)}:</span>{" "}
                              {new Date(p.scheduledAt).toLocaleString("en-IN", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {platforms.length === 0 ? (
                        <span className="text-xs text-neutral-600">—</span>
                      ) : uniformStatus ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(uniformStatus)}`}
                        >
                          {uniformStatus}
                        </span>
                      ) : (
                        <span
                          className="cursor-help rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900"
                          title={mixedTitle}
                        >
                          Mixed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {anyScheduled && (
                          <Button variant="secondary" className="text-xs" onClick={() => void publishNow(item.id)}>
                            Publish now
                          </Button>
                        )}
                        {anyEditable && (
                          <Button
                            variant="secondary"
                            className="text-xs"
                            onClick={() => {
                              setRescheduleTarget(item);
                              const src = platforms.find((p) => p.status === "SCHEDULED") ?? platforms[0];
                              setRescheduleAt(
                                src
                                  ? new Date(src.scheduledAt).toISOString().slice(0, 16)
                                  : new Date().toISOString().slice(0, 16),
                              );
                            }}
                          >
                            Reschedule
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="secondary"
                            className="text-xs"
                            onClick={async () => {
                              await fetch(`/api/posts/${item.id}`, { method: "DELETE", credentials: "include" });
                              toast.success("Post deleted");
                              await load();
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        </div>
        {!loading && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-3 py-3 text-sm text-neutral-600">
            <span className="text-xs text-neutral-600">
              Page {Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE)))} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={page * PAGE_SIZE >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
            <p className="text-sm font-semibold text-neutral-900">Reschedule post</p>
            <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{rescheduleTarget.content}</p>
            <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              New date & time
              <input
                type="datetime-local"
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                value={rescheduleAt}
                onChange={(e) => setRescheduleAt(e.target.value)}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRescheduleTarget(null)}>
                Cancel
              </Button>
              <Button onClick={() => void reschedulePost()}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {bulkRescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
            <p className="text-sm font-semibold text-neutral-900">Bulk reschedule</p>
            <p className="mt-1 text-xs text-neutral-600">{selectedIds.length} selected post(s)</p>
            <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              New date & time
              <input
                type="datetime-local"
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                value={bulkRescheduleAt}
                onChange={(e) => setBulkRescheduleAt(e.target.value)}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setBulkRescheduleOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void rescheduleSelected()}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
