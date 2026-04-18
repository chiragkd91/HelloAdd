import {
  Integration,
  ScheduledPost,
  connectMongo,
  type ScheduledPostPlatformConfig,
  type ScheduledPostPlatformEngagement,
} from "@helloadd/database";
import { getLinkedInPostEngagement } from "@/lib/api/linkedin";
import { getFacebookPostEngagement, getInstagramMediaEngagement } from "@/lib/api/meta";
import { getYouTubeVideoEngagement } from "@/lib/api/youtube";
import { getValidToken } from "@/lib/sync/tokenManager";

const ERROR_CODE = {
  needsPublish: "NEEDS_PUBLISH",
  missingPostId: "MISSING_POST_ID",
  placeholderManual: "PLACEHOLDER_MANUAL",
  unsupported: "UNSUPPORTED_PLATFORM",
  notConnected: "NOT_CONNECTED",
  tokenUnavailable: "TOKEN_UNAVAILABLE",
  refreshFailed: "REFRESH_FAILED",
} as const;

const UNSUPPORTED_REASON: Record<string, string> = {
  GOOGLE: "Google scheduler publishing uses placeholders here — no organic post object to measure.",
  TWITTER: "X/Twitter scheduler publishing uses placeholders here — engagement API is not wired in this flow yet.",
  WHATSAPP: "WhatsApp messages do not expose public likes/comments metrics in this integration.",
};

function codedMessage(code: string, message: string): string {
  return `${code}: ${message}`;
}

function isPlaceholderExternalId(id: string | null | undefined): boolean {
  if (!id) return true;
  return id.startsWith("manual:") || id.startsWith("whatsapp:");
}

function integrationPlatformForEngagement(platform: ScheduledPostPlatformConfig["platform"]) {
  if (platform === "INSTAGRAM") return "FACEBOOK";
  if (platform === "YOUTUBE") return "GOOGLE";
  return platform;
}

function emptyWithError(now: Date, message: string): ScheduledPostPlatformEngagement {
  return {
    likes: null,
    comments: null,
    shares: null,
    impressions: null,
    fetchedAt: now,
    fetchError: message,
  };
}

async function computePlatformEngagement(
  organizationId: string,
  p: ScheduledPostPlatformConfig,
  now: Date
): Promise<ScheduledPostPlatformEngagement> {
  if (p.status !== "PUBLISHED") {
    return emptyWithError(
      now,
      codedMessage(ERROR_CODE.needsPublish, "Publish this platform first to load engagement.")
    );
  }
  if (!p.externalPostId) {
    return emptyWithError(now, codedMessage(ERROR_CODE.missingPostId, "No network post ID stored."));
  }
  if (isPlaceholderExternalId(p.externalPostId)) {
    if (p.externalPostId.startsWith("manual:")) {
      return emptyWithError(
        now,
        codedMessage(
          ERROR_CODE.placeholderManual,
          "This platform uses a manual placeholder ID — metrics are not available from API."
        )
      );
    }
    if (p.externalPostId.startsWith("whatsapp:")) {
      return emptyWithError(now, codedMessage(ERROR_CODE.unsupported, UNSUPPORTED_REASON.WHATSAPP));
    }
    return emptyWithError(now, codedMessage(ERROR_CODE.missingPostId, "No network post ID stored."));
  }

  const integrationPlatform = integrationPlatformForEngagement(p.platform);
  const integration = await Integration.findOne({
    organizationId,
    platform: integrationPlatform,
    isActive: true,
  }).lean();

  if (!integration) {
    return emptyWithError(
      now,
      codedMessage(
        ERROR_CODE.notConnected,
        `No active ${integrationPlatform} integration. Connect this platform first.`
      )
    );
  }

  const token = await getValidToken(integration._id);
  if (!token) {
    return emptyWithError(
      now,
      codedMessage(ERROR_CODE.tokenUnavailable, "Could not obtain a valid access token for this integration.")
    );
  }

  try {
    switch (p.platform) {
      case "FACEBOOK": {
        const m = await getFacebookPostEngagement(token, p.externalPostId);
        return {
          likes: m.likes,
          comments: m.comments,
          shares: m.shares,
          impressions: m.impressions,
          fetchedAt: now,
          fetchError: null,
        };
      }
      case "INSTAGRAM": {
        const m = await getInstagramMediaEngagement(token, p.externalPostId);
        return {
          likes: m.likes,
          comments: m.comments,
          shares: m.shares,
          impressions: m.impressions,
          fetchedAt: now,
          fetchError: null,
        };
      }
      case "LINKEDIN": {
        const m = await getLinkedInPostEngagement(token, p.externalPostId);
        return {
          likes: m.likes,
          comments: m.comments,
          shares: m.shares,
          impressions: m.impressions,
          fetchedAt: now,
          fetchError: null,
        };
      }
      case "GOOGLE":
        return emptyWithError(now, codedMessage(ERROR_CODE.unsupported, UNSUPPORTED_REASON.GOOGLE));
      case "YOUTUBE": {
        const m = await getYouTubeVideoEngagement(token, p.externalPostId);
        return {
          likes: m.likes,
          comments: m.comments,
          shares: m.shares,
          impressions: m.impressions,
          fetchedAt: now,
          fetchError: null,
        };
      }
      case "TWITTER":
        return emptyWithError(now, codedMessage(ERROR_CODE.unsupported, UNSUPPORTED_REASON.TWITTER));
      case "WHATSAPP":
        return emptyWithError(now, codedMessage(ERROR_CODE.unsupported, UNSUPPORTED_REASON.WHATSAPP));
      default: {
        const _never: never = p.platform;
        return emptyWithError(now, codedMessage(ERROR_CODE.unsupported, `Unsupported platform: ${String(_never)}`));
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      likes: null,
      comments: null,
      shares: null,
      impressions: null,
      fetchedAt: now,
      fetchError: codedMessage(ERROR_CODE.refreshFailed, msg.slice(0, 500)),
    };
  }
}

/**
 * Refreshes stored engagement for every platform row on the post (likes, comments, etc.).
 */
export async function refreshPostEngagement(postId: string, organizationId: string): Promise<void> {
  await connectMongo();
  const post = await ScheduledPost.findOne({ _id: postId, organizationId });
  if (!post) {
    throw new Error("POST_NOT_FOUND");
  }

  const now = new Date();
  for (let i = 0; i < post.platforms.length; i++) {
    const p = post.platforms[i];
    post.platforms[i].engagement = await computePlatformEngagement(organizationId, p, now);
  }
  post.markModified("platforms");
  await post.save();
}
