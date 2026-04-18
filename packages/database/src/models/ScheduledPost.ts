import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";
import { PlatformValues, type Platform } from "../enums";

export const ScheduledPostStatusValues = ["SCHEDULED", "PUBLISHED", "FAILED", "DRAFT"] as const;
export type ScheduledPostStatus = (typeof ScheduledPostStatusValues)[number];

export const InstagramPostTypeValues = ["FEED", "STORY", "REEL"] as const;
export type InstagramPostType = (typeof InstagramPostTypeValues)[number];

export const LinkedInVisibilityValues = ["PUBLIC", "CONNECTIONS"] as const;
export type LinkedInVisibility = (typeof LinkedInVisibilityValues)[number];

export const YouTubePrivacyValues = ["PUBLIC", "PRIVATE", "UNLISTED"] as const;
export type YouTubePrivacy = (typeof YouTubePrivacyValues)[number];

export const WhatsAppPostTypeValues = ["STATUS", "BROADCAST"] as const;
export type WhatsAppPostType = (typeof WhatsAppPostTypeValues)[number];

/** Snapshot from each network’s API (likes, comments, etc.). */
export type ScheduledPostPlatformEngagement = {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  impressions: number | null;
  fetchedAt: Date | null;
  /** When the network doesn’t expose metrics or the call failed. */
  fetchError?: string | null;
};

export type ScheduledPostPlatformConfig = {
  platform: Platform;
  status: ScheduledPostStatus;
  scheduledAt: Date;
  publishedAt?: Date | null;
  externalPostId?: string | null;
  errorMessage?: string | null;
  engagement?: ScheduledPostPlatformEngagement | null;
  platformSpecific?: {
    instagramType?: InstagramPostType | null;
    linkedinVisibility?: LinkedInVisibility | null;
    youtubePrivacy?: YouTubePrivacy | null;
    whatsappType?: WhatsAppPostType | null;
  };
};

export type ScheduledPostAttrs = {
  _id: string;
  organizationId: string;
  createdBy: string;
  content: string;
  mediaUrls: string[];
  platforms: ScheduledPostPlatformConfig[];
  tags: string[];
  campaignId?: string | null;
  isRecurring: boolean;
  recurringSchedule?: string | null;
  /** Set on posts created by the recurring worker; unique per parent when present. */
  spawnedFromPostId?: string | null;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const platformConfigSchema = new Schema<ScheduledPostPlatformConfig>(
  {
    platform: { type: String, enum: PlatformValues, required: true },
    status: { type: String, enum: ScheduledPostStatusValues, default: "SCHEDULED" },
    scheduledAt: { type: Date, required: true },
    publishedAt: { type: Date, default: null },
    externalPostId: { type: String, default: null },
    errorMessage: { type: String, default: null },
    engagement: {
      likes: { type: Number, default: null },
      comments: { type: Number, default: null },
      shares: { type: Number, default: null },
      impressions: { type: Number, default: null },
      fetchedAt: { type: Date, default: null },
      fetchError: { type: String, default: null },
    },
    platformSpecific: {
      instagramType: { type: String, enum: InstagramPostTypeValues, default: null },
      linkedinVisibility: { type: String, enum: LinkedInVisibilityValues, default: null },
      youtubePrivacy: { type: String, enum: YouTubePrivacyValues, default: null },
      whatsappType: { type: String, enum: WhatsAppPostTypeValues, default: null },
    },
  },
  { _id: false }
);

const scheduledPostSchema = new Schema<ScheduledPostAttrs>(
  {
    _id: { type: String, default: () => createId() },
    organizationId: { type: String, required: true, ref: "Organization" },
    createdBy: { type: String, required: true, ref: "User" },
    content: { type: String, required: true },
    mediaUrls: [{ type: String }],
    platforms: [platformConfigSchema],
    tags: [{ type: String }],
    campaignId: { type: String, default: null, ref: "Campaign" },
    isRecurring: { type: Boolean, default: false },
    recurringSchedule: { type: String, default: null },
    spawnedFromPostId: { type: String, default: null, ref: "ScheduledPost" },
    aiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

scheduledPostSchema.index({ organizationId: 1, updatedAt: -1 });
scheduledPostSchema.index(
  { spawnedFromPostId: 1 },
  { unique: true, sparse: true, name: "scheduled_posts_spawnedFrom_unique_sparse" }
);
scheduledPostSchema.index({ organizationId: 1, "platforms.status": 1, "platforms.scheduledAt": 1 });
scheduledPostSchema.index({ campaignId: 1 });

export const ScheduledPost: Model<ScheduledPostAttrs> =
  models?.ScheduledPost ??
  model<ScheduledPostAttrs>("ScheduledPost", scheduledPostSchema, "scheduled_posts");
