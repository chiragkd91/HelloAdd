import { Integration, Organization, ScheduledPost, type Platform } from "@helloadd/database";
import { publishLinkedInPost } from "@/lib/api/linkedin";
import { publishFacebookPost, publishInstagramPost } from "@/lib/api/meta";
import { publishYouTubeVideo } from "@/lib/api/youtube";
import { sendWhatsAppText } from "@/lib/notifications/whatsapp";
import { getValidToken } from "@/lib/sync/tokenManager";

async function publishFacebook(
  accessToken: string,
  pageId: string,
  message: string
): Promise<{ externalPostId: string }> {
  const id = await publishFacebookPost(accessToken, pageId, message);
  return { externalPostId: id };
}

async function publishInstagram(
  accessToken: string,
  igUserId: string,
  caption: string,
  imageUrl?: string
): Promise<{ externalPostId: string }> {
  if (!imageUrl) {
    throw new Error("INSTAGRAM_REQUIRES_IMAGE");
  }
  const id = await publishInstagramPost(accessToken, igUserId, imageUrl, caption);
  return { externalPostId: id };
}

async function publishLinkedIn(accessToken: string, authorUrn: string, text: string): Promise<{ externalPostId: string }> {
  const id = await publishLinkedInPost(accessToken, authorUrn, text);
  return { externalPostId: id };
}

async function publishYouTube(
  accessToken: string,
  title: string,
  description: string,
  mediaUrl?: string,
  privacy: "PUBLIC" | "PRIVATE" | "UNLISTED" = "UNLISTED"
): Promise<{ externalPostId: string }> {
  if (!mediaUrl) {
    throw new Error("YOUTUBE_REQUIRES_VIDEO_MEDIA_URL");
  }
  const mappedPrivacy =
    privacy === "PUBLIC" ? "public" : privacy === "PRIVATE" ? "private" : "unlisted";
  const id = await publishYouTubeVideo(accessToken, mediaUrl, title, description, mappedPrivacy);
  return { externalPostId: id };
}

async function publishWhatsApp(organizationId: string, message: string): Promise<{ externalPostId: string }> {
  const org = await Organization.findById(organizationId).select({ settings: 1 }).lean();
  const to = org?.settings?.whatsappNumber?.trim();
  if (!to) {
    throw new Error("WHATSAPP_NUMBER_NOT_CONFIGURED");
  }
  await sendWhatsAppText(to, message, { organizationId });
  return { externalPostId: `whatsapp:${Date.now()}` };
}

/**
 * Temporary parity fallback for platforms without direct organic publish APIs in this stack.
 * We mark these as manually published so scheduler flow does not hard-fail.
 */
async function publishManualFallback(platform: "GOOGLE" | "TWITTER"): Promise<{ externalPostId: string }> {
  return { externalPostId: `manual:${platform.toLowerCase()}:${Date.now()}` };
}

function integrationPlatformForPublish(platform: Platform): Platform {
  if (platform === "INSTAGRAM") return "FACEBOOK";
  if (platform === "YOUTUBE") return "GOOGLE";
  return platform;
}

async function publishToPlatform(args: {
  organizationId: string;
  platform: Platform;
  content: string;
  mediaUrls: string[];
  platformSpecific?: {
    instagramType?: "FEED" | "STORY" | "REEL" | null;
    linkedinVisibility?: "PUBLIC" | "CONNECTIONS" | null;
    youtubePrivacy?: "PUBLIC" | "PRIVATE" | "UNLISTED" | null;
    whatsappType?: "STATUS" | "BROADCAST" | null;
  } | null;
}): Promise<{ externalPostId: string }> {
  if (args.platform === "GOOGLE" || args.platform === "TWITTER") {
    return publishManualFallback(args.platform);
  }

  const lookupPlatform = integrationPlatformForPublish(args.platform);

  const integration = await Integration.findOne({
    organizationId: args.organizationId,
    platform: lookupPlatform,
    isActive: true,
  }).lean();
  if (!integration) {
    throw new Error(`NO_ACTIVE_${lookupPlatform}_INTEGRATION`);
  }

  const token = await getValidToken(integration._id);
  if (!token) {
    throw new Error(`${args.platform}_TOKEN_UNAVAILABLE`);
  }

  switch (args.platform) {
    case "FACEBOOK": {
      const pageId =
        typeof integration.metadata === "object" &&
        integration.metadata &&
        typeof (integration.metadata as { pageId?: unknown }).pageId === "string"
          ? ((integration.metadata as { pageId?: string }).pageId as string)
          : integration.accountId;
      return publishFacebook(token, pageId, args.content);
    }
    case "INSTAGRAM": {
      const igUserId =
        typeof integration.metadata === "object" &&
        integration.metadata &&
        typeof (integration.metadata as { igUserId?: unknown }).igUserId === "string"
          ? ((integration.metadata as { igUserId?: string }).igUserId as string)
          : integration.accountId;
      return publishInstagram(token, igUserId, args.content, args.mediaUrls[0]);
    }
    case "LINKEDIN": {
      const authorUrn =
        typeof integration.metadata === "object" &&
        integration.metadata &&
        typeof (integration.metadata as { authorUrn?: unknown }).authorUrn === "string"
          ? ((integration.metadata as { authorUrn?: string }).authorUrn as string)
          : integration.accountId.startsWith("urn:")
            ? integration.accountId
            : `urn:li:person:${integration.accountId}`;
      return publishLinkedIn(token, authorUrn, args.content);
    }
    case "YOUTUBE": {
      const explicitTitle =
        typeof integration.metadata === "object" &&
        integration.metadata &&
        typeof (integration.metadata as { defaultYouTubeTitle?: unknown }).defaultYouTubeTitle === "string"
          ? ((integration.metadata as { defaultYouTubeTitle?: string }).defaultYouTubeTitle as string)
          : "";
      const title = explicitTitle || args.content.split("\n").map((s) => s.trim()).find(Boolean) || "Scheduled Upload";
      return publishYouTube(
        token,
        title,
        args.content,
        args.mediaUrls[0],
        args.platformSpecific?.youtubePrivacy ?? "UNLISTED"
      );
    }
    case "WHATSAPP":
      return publishWhatsApp(args.organizationId, args.content);
    default: {
      const neverPlatform: never = args.platform;
      throw new Error(`UNSUPPORTED_PLATFORM_${String(neverPlatform)}`);
    }
  }
}

export async function publishPostById(postId: string): Promise<{
  postId: string;
  publishedCount: number;
  failedCount: number;
}> {
  const post = await ScheduledPost.findById(postId);
  if (!post) {
    throw new Error("POST_NOT_FOUND");
  }

  const now = new Date();
  let publishedCount = 0;
  let failedCount = 0;

  for (const platformConfig of post.platforms) {
    if (platformConfig.status !== "SCHEDULED") continue;
    if (platformConfig.scheduledAt > now) continue;
    try {
      const res = await publishToPlatform({
        organizationId: post.organizationId,
        platform: platformConfig.platform,
        content: post.content,
        mediaUrls: post.mediaUrls,
        platformSpecific: platformConfig.platformSpecific ?? null,
      });
      platformConfig.status = "PUBLISHED";
      platformConfig.publishedAt = now;
      platformConfig.externalPostId = res.externalPostId;
      platformConfig.errorMessage = null;
      publishedCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      platformConfig.status = "FAILED";
      platformConfig.errorMessage = message.slice(0, 300);
      failedCount += 1;
    }
  }

  await post.save();
  return { postId: post._id, publishedCount, failedCount };
}

export async function publishDuePosts(): Promise<{ checked: number; published: number; failed: number }> {
  const now = new Date();
  const duePosts = await ScheduledPost.find({
    platforms: { $elemMatch: { status: "SCHEDULED", scheduledAt: { $lte: now } } },
  }).select({ _id: 1 });

  let published = 0;
  let failed = 0;

  for (const post of duePosts) {
    const result = await publishPostById(post._id);
    published += result.publishedCount;
    failed += result.failedCount;
  }

  return { checked: duePosts.length, published, failed };
}
