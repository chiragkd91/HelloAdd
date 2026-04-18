import type { ScheduledPostAttrs } from "@helloadd/database";

function serializeEngagement(p: ScheduledPostAttrs["platforms"][number]) {
  const e = p.engagement;
  if (!e) return null;
  return {
    likes: e.likes ?? null,
    comments: e.comments ?? null,
    shares: e.shares ?? null,
    impressions: e.impressions ?? null,
    fetchedAt: e.fetchedAt ? e.fetchedAt.toISOString() : null,
    fetchError: e.fetchError ?? null,
  };
}

export function serializeScheduledPost(post: ScheduledPostAttrs) {
  return {
    id: post._id,
    organizationId: post.organizationId,
    createdBy: post.createdBy,
    content: post.content,
    mediaUrls: post.mediaUrls,
    platforms: post.platforms.map((p) => ({
      platform: p.platform,
      status: p.status,
      scheduledAt: p.scheduledAt.toISOString(),
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      externalPostId: p.externalPostId ?? null,
      errorMessage: p.errorMessage ?? null,
      engagement: serializeEngagement(p),
      platformSpecific: p.platformSpecific ?? null,
    })),
    tags: post.tags,
    campaignId: post.campaignId ?? null,
    isRecurring: post.isRecurring,
    recurringSchedule: post.recurringSchedule ?? null,
    spawnedFromPostId: post.spawnedFromPostId ?? null,
    aiGenerated: post.aiGenerated,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}
