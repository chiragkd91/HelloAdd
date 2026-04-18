import { ScheduledPost, type ScheduledPostAttrs, connectMongo } from "@helloadd/database";

function isMongoDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: number }).code === 11000;
}

/** Supported `recurringSchedule` values from the create form / API. */
const ALLOWED = new Set(["daily", "weekly", "monthly"]);

/**
 * Computes the next run after `from` using a simple schedule keyword.
 * @throws if `schedule` is not supported
 */
export function addRecurringInterval(from: Date, schedule: string): Date {
  const s = schedule.trim().toLowerCase();
  const d = new Date(from.getTime());
  if (s === "daily" || s === "p1d") {
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (s === "weekly" || s === "p7d") {
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (s === "monthly" || s === "p1m") {
    d.setMonth(d.getMonth() + 1);
    return d;
  }
  const dayMatch = /^p(\d+)d$/i.exec(schedule.trim());
  if (dayMatch) {
    d.setDate(d.getDate() + Number(dayMatch[1]));
    return d;
  }
  throw new Error(`Unsupported recurringSchedule: ${schedule}`);
}

function isAllowedSchedule(s: string | null | undefined): boolean {
  if (!s) return false;
  return ALLOWED.has(s.trim().toLowerCase()) || /^p\d+d$/i.test(s.trim());
}

function anchorTime(platforms: ScheduledPostAttrs["platforms"]): Date | null {
  let maxPub = 0;
  for (const p of platforms) {
    const t = p.publishedAt ? new Date(p.publishedAt).getTime() : 0;
    if (t > maxPub) maxPub = t;
  }
  if (maxPub > 0) return new Date(maxPub);
  let maxSched = 0;
  for (const p of platforms) {
    const t = new Date(p.scheduledAt).getTime();
    if (t > maxSched) maxSched = t;
  }
  return maxSched > 0 ? new Date(maxSched) : null;
}

function allPlatformsPublished(platforms: ScheduledPostAttrs["platforms"]): boolean {
  return platforms.length > 0 && platforms.every((p) => p.status === "PUBLISHED");
}

function normalizeScheduleAt(nextAt: Date): Date {
  const now = Date.now();
  if (nextAt.getTime() <= now) {
    return new Date(now + 60_000);
  }
  return nextAt;
}

/**
 * For each recurring post whose last run has finished (all platforms published) and the next
 * occurrence is due, creates a new scheduled post and turns off recurrence on the parent.
 */
export async function processRecurringPosts(): Promise<{ scanned: number; created: number }> {
  await connectMongo();

  const candidates = await ScheduledPost.find({
    isRecurring: true,
    recurringSchedule: { $nin: [null, ""] },
  }).lean();

  let created = 0;

  for (const raw of candidates) {
    const post = raw as ScheduledPostAttrs;
    if (!post.platforms?.length) continue;
    if (!allPlatformsPublished(post.platforms)) continue;
    if (!isAllowedSchedule(post.recurringSchedule)) continue;

    const anchor = anchorTime(post.platforms);
    if (!anchor) continue;

    let nextAt: Date;
    try {
      nextAt = addRecurringInterval(anchor, post.recurringSchedule!);
    } catch {
      continue;
    }

    const now = new Date();
    if (nextAt > now) continue;

    const scheduleAt = normalizeScheduleAt(nextAt);

    const existingChild = await ScheduledPost.findOne({ spawnedFromPostId: post._id }).select({ _id: 1 }).lean();
    if (existingChild) {
      await ScheduledPost.updateOne({ _id: post._id }, { $set: { isRecurring: false } });
      continue;
    }

    try {
      await ScheduledPost.create({
        organizationId: post.organizationId,
        createdBy: post.createdBy,
        content: post.content,
        mediaUrls: post.mediaUrls ?? [],
        tags: post.tags ?? [],
        campaignId: post.campaignId ?? null,
        isRecurring: true,
        recurringSchedule: post.recurringSchedule,
        spawnedFromPostId: post._id,
        aiGenerated: post.aiGenerated ?? false,
        platforms: post.platforms.map((p) => ({
          platform: p.platform,
          status: "SCHEDULED" as const,
          scheduledAt: scheduleAt,
          publishedAt: null,
          externalPostId: null,
          errorMessage: null,
          platformSpecific: {
            instagramType: p.platformSpecific?.instagramType ?? null,
            linkedinVisibility: p.platformSpecific?.linkedinVisibility ?? null,
            youtubePrivacy: p.platformSpecific?.youtubePrivacy ?? null,
            whatsappType: p.platformSpecific?.whatsappType ?? null,
          },
        })),
      });

      await ScheduledPost.updateOne({ _id: post._id }, { $set: { isRecurring: false } });
      created += 1;
    } catch (e) {
      if (isMongoDuplicateKey(e)) {
        await ScheduledPost.updateOne({ _id: post._id }, { $set: { isRecurring: false } });
        continue;
      }
      console.error("[recurring-posts]", post._id, e);
    }
  }

  return { scanned: candidates.length, created };
}
