"use client";

import { Button } from "@/components/ui/Button";
import { platformLabel } from "@/lib/campaignDisplay";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type EngagementRow = {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  impressions: number | null;
  fetchedAt: string | null;
  fetchError: string | null;
} | null;

type PlatformRow = {
  platform: string;
  status: string;
  scheduledAt: string;
  publishedAt: string | null;
  externalPostId: string | null;
  errorMessage: string | null;
  engagement: EngagementRow;
  platformSpecific: Record<string, unknown> | null;
};

type ScheduledPostDetail = {
  id: string;
  content: string;
  mediaUrls: string[];
  platforms: PlatformRow[];
  tags: string[];
  campaignId: string | null;
  isRecurring: boolean;
  recurringSchedule: string | null;
  spawnedFromPostId?: string | null;
  aiGenerated: boolean;
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

type EngagementIssue = {
  code: string;
  message: string;
  severityClass: string;
  label: string;
  actionHref?: string;
  actionLabel?: string;
};

function parseEngagementIssue(raw: string | null | undefined): EngagementIssue | null {
  if (!raw) return null;
  const text = raw.trim();
  const splitAt = text.indexOf(":");
  const hasCodePrefix = splitAt > 0 && splitAt < 32;
  const code = hasCodePrefix ? text.slice(0, splitAt).trim() : "INFO";
  const message = hasCodePrefix ? text.slice(splitAt + 1).trim() : text;

  switch (code) {
    case "NOT_CONNECTED":
      return {
        code,
        message,
        label: "Not connected",
        severityClass: "bg-blue-50 text-blue-900 border-blue-200",
        actionHref: "/integrations",
        actionLabel: "Connect integration",
      };
    case "UNSUPPORTED_PLATFORM":
      return {
        code,
        message,
        label: "Coming soon",
        severityClass: "bg-violet-50 text-violet-900 border-violet-200",
      };
    case "PLACEHOLDER_MANUAL":
      return {
        code,
        message,
        label: "Manual placeholder",
        severityClass: "bg-neutral-100 text-neutral-800 border-neutral-200",
      };
    case "NEEDS_PUBLISH":
    case "MISSING_POST_ID":
      return {
        code,
        message,
        label: "Action needed",
        severityClass: "bg-amber-50 text-amber-900 border-amber-200",
      };
    case "TOKEN_UNAVAILABLE":
    case "REFRESH_FAILED":
      return {
        code,
        message,
        label: "Refresh error",
        severityClass: "bg-red-50 text-red-900 border-red-200",
        actionHref: "/integrations",
        actionLabel: "Check integration",
      };
    default:
      return {
        code,
        message,
        label: "Info",
        severityClass: "bg-neutral-100 text-neutral-800 border-neutral-200",
      };
  }
}

export default function ScheduledPostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [post, setPost] = useState<ScheduledPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [engagementLoading, setEngagementLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await fetch(`/api/posts/${id}`, { credentials: "include", cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as ScheduledPostDetail & { error?: string };
      if (res.status === 404) {
        setNotFound(true);
        setPost(null);
        return;
      }
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : "Could not load post.");
        setPost(null);
        return;
      }
      setPost(body as ScheduledPostDetail);
    } catch {
      setError("Network error.");
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshEngagement() {
    if (!id) return;
    setEngagementLoading(true);
    try {
      const res = await fetch(`/api/posts/${id}/engagement`, {
        method: "POST",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as ScheduledPostDetail & { error?: string };
      if (!res.ok) {
        toast.error(typeof body.error === "string" ? body.error : "Could not refresh engagement.");
        return;
      }
      setPost(body as ScheduledPostDetail);
      toast.success("Engagement updated");
    } catch {
      toast.error("Network error.");
    } finally {
      setEngagementLoading(false);
    }
  }

  async function publishNow() {
    if (!id) return;
    const res = await fetch(`/api/posts/${id}/publish-now`, { method: "POST", credentials: "include" });
    if (!res.ok) {
      toast.error("Publish failed");
      return;
    }
    toast.success("Publish triggered");
    await load();
  }

  async function runReschedule() {
    if (!post || !rescheduleAt) return;
    const body = {
      platforms: post.platforms.map((p) => ({
        platform: p.platform,
        status: "SCHEDULED",
        scheduledAt: new Date(rescheduleAt).toISOString(),
      })),
    };
    const res = await fetch(`/api/posts/${id}`, {
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
    setRescheduleOpen(false);
    await load();
  }

  async function runDelete() {
    if (!id) return;
    if (!confirm("Delete this post? Published posts cannot be deleted from the API.")) return;
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE", credentials: "include" });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(j.error ?? "Delete failed");
      return;
    }
    toast.success("Post deleted");
    router.push("/scheduler");
  }

  if (!id) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-sm text-amber-950">
        Invalid post URL.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-32 animate-pulse rounded-2xl bg-neutral-100" />
        <div className="h-48 animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-neutral-900">Post not found</h1>
        <p className="mt-2 text-sm text-neutral-600">It may have been removed or you don&apos;t have access.</p>
        <Link
          href="/scheduler"
          className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover"
        >
          Back to scheduler
        </Link>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-sm text-amber-950">
        {error ?? "Could not load post."}
        <button type="button" className="ml-2 font-semibold text-primary underline" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  const hasScheduled = post.platforms.some((p) => p.status === "SCHEDULED");
  const allPublished = post.platforms.length > 0 && post.platforms.every((p) => p.status === "PUBLISHED");
  const canEditOrDelete = !post.platforms.some((p) => p.status === "PUBLISHED");

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/scheduler" className="text-sm font-medium text-primary hover:underline">
            ← Scheduler
          </Link>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight text-neutral-900">Scheduled post</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {post.platforms.map((p) => platformLabel(p.platform)).join(" · ")}
            {post.aiGenerated && (
              <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
                AI-assisted
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasScheduled && (
            <Button type="button" variant="secondary" onClick={() => void publishNow()}>
              Publish now
            </Button>
          )}
          {canEditOrDelete && (hasScheduled || post.platforms.some((p) => p.status === "FAILED" || p.status === "DRAFT")) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const primary = post.platforms[0];
                setRescheduleAt(
                  primary
                    ? new Date(primary.scheduledAt).toISOString().slice(0, 16)
                    : new Date().toISOString().slice(0, 16),
                );
                setRescheduleOpen(true);
              }}
            >
              Reschedule
            </Button>
          )}
          {canEditOrDelete && (
            <Button type="button" variant="secondary" className="text-red-700 hover:bg-red-50" onClick={() => void runDelete()}>
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-medium text-neutral-600">Created</p>
          <p className="mt-1 font-medium text-neutral-900">{new Date(post.createdAt).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-medium text-neutral-600">Updated</p>
          <p className="mt-1 font-medium text-neutral-900">{new Date(post.updatedAt).toLocaleString()}</p>
        </div>
        {post.campaignId && (
          <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:col-span-2">
            <p className="text-xs font-medium text-neutral-600">Campaign</p>
            <Link href={`/campaigns/${post.campaignId}`} className="mt-1 inline-block font-semibold text-primary hover:underline">
              Open campaign
            </Link>
          </div>
        )}
        {post.spawnedFromPostId && (
          <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:col-span-2">
            <p className="text-xs font-medium text-neutral-600">Recurring chain</p>
            <Link
              href={`/scheduler/${post.spawnedFromPostId}`}
              className="mt-1 inline-block font-semibold text-primary hover:underline"
            >
              Open previous run
            </Link>
          </div>
        )}
        {(post.isRecurring || post.recurringSchedule) && (
          <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:col-span-2">
            <p className="text-xs font-medium text-neutral-600">Recurrence</p>
            <p className="mt-1 text-neutral-900">
              {post.isRecurring ? "Yes" : "No"}
              {post.recurringSchedule ? ` — ${post.recurringSchedule}` : ""}
            </p>
          </div>
        )}
      </div>

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span key={t} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Content</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{post.content}</p>
      </div>

      {post.mediaUrls.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Media</h2>
          <ul className="mt-3 space-y-2">
            {post.mediaUrls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-primary hover:underline">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Platforms</h2>
        <p className="mt-1 text-xs text-neutral-600">Each network has its own schedule, status, and publish result.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-600">
                <th className="py-2 pr-3">Platform</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Scheduled</th>
                <th className="py-2 pr-3">Published</th>
                <th className="py-2 pr-3">External ID</th>
                <th className="py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {post.platforms.map((p) => (
                <tr key={`${post.id}-${p.platform}`} className="border-b border-neutral-100 align-top">
                  <td className="py-3 pr-3 font-medium text-neutral-900">{platformLabel(p.platform)}</td>
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-neutral-700">{new Date(p.scheduledAt).toLocaleString()}</td>
                  <td className="py-3 pr-3 text-neutral-700">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleString() : "—"}
                  </td>
                  <td className="py-3 pr-3 font-mono text-xs text-neutral-600">
                    {p.externalPostId ?? "—"}
                  </td>
                  <td className="py-3 text-xs text-red-700">{p.errorMessage ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {allPublished && (
          <p className="mt-3 text-xs text-neutral-600">All platforms published. Content and schedule cannot be edited.</p>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Engagement</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Likes, comments, and shares per network after publish. Facebook and Instagram load live counts from Meta
              when you refresh. LinkedIn, X, YouTube, Google, and WhatsApp show limits or placeholders until those APIs
              are connected.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={engagementLoading}
            onClick={() => void refreshEngagement()}
          >
            {engagementLoading ? "Refreshing…" : "Refresh engagement"}
          </Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {post.platforms.map((p) => {
            const e = p.engagement;
            const issue = parseEngagementIssue(e?.fetchError);
            return (
              <div
                key={`${post.id}-${p.platform}-eng`}
                className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-4"
              >
                <p className="text-sm font-semibold text-neutral-900">{platformLabel(p.platform)}</p>
                {!e ? (
                  <p className="mt-2 text-xs text-neutral-600">No snapshot yet — use Refresh engagement after publish.</p>
                ) : (
                  <>
                    <dl className="mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-neutral-600">Likes / reactions</dt>
                        <dd className="font-medium tabular-nums text-neutral-900">
                          {e.likes !== null ? e.likes.toLocaleString() : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-neutral-600">Comments</dt>
                        <dd className="font-medium tabular-nums text-neutral-900">
                          {e.comments !== null ? e.comments.toLocaleString() : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-neutral-600">Shares</dt>
                        <dd className="font-medium tabular-nums text-neutral-900">
                          {e.shares !== null ? e.shares.toLocaleString() : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-neutral-600">Impressions</dt>
                        <dd className="font-medium tabular-nums text-neutral-900">
                          {e.impressions !== null ? e.impressions.toLocaleString() : "—"}
                        </dd>
                      </div>
                    </dl>
                    {e.fetchedAt && (
                      <p className="mt-2 text-[11px] text-neutral-600">
                        Last fetched {new Date(e.fetchedAt).toLocaleString()}
                      </p>
                    )}
                    {issue && (
                      <div className={`mt-2 rounded-lg border px-2 py-1.5 text-[11px] leading-snug ${issue.severityClass}`}>
                        <p className="font-semibold">{issue.label}</p>
                        <p className="mt-0.5">{issue.message}</p>
                        {issue.actionHref && issue.actionLabel && (
                          <Link href={issue.actionHref} className="mt-1 inline-block font-semibold text-primary hover:underline">
                            {issue.actionLabel}
                          </Link>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {rescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
            <p className="text-sm font-semibold text-neutral-900">Reschedule all platforms</p>
            <p className="mt-1 text-xs text-neutral-600">Applies the same time to every platform row.</p>
            <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              New date &amp; time
              <input
                type="datetime-local"
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                value={rescheduleAt}
                onChange={(e) => setRescheduleAt(e.target.value)}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRescheduleOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void runReschedule()}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
