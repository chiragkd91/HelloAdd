import {
  PlatformValues,
  ScheduledPost,
  ScheduledPostStatusValues,
  type Platform,
  type ScheduledPostAttrs,
} from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { enforceAgencyScheduledPostRules } from "@/lib/agency/enforceScheduledPost";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";
import { requireUserOrgRole } from "@/lib/auth/rbac";
import { serializeScheduledPost } from "@/lib/scheduler/serializeScheduledPost";

const platformEnum = z.enum(PlatformValues as unknown as [string, ...string[]]);
const statusEnum = z.enum(ScheduledPostStatusValues as unknown as [string, ...string[]]);
const instagramTypeEnum = z.enum(["FEED", "STORY", "REEL"]);
const linkedinVisibilityEnum = z.enum(["PUBLIC", "CONNECTIONS"]);
const youtubePrivacyEnum = z.enum(["PUBLIC", "PRIVATE", "UNLISTED"]);
const whatsappTypeEnum = z.enum(["STATUS", "BROADCAST"]);

const createSchema = z
  .object({
    content: z.string().min(1),
    mediaUrls: z.array(z.string().min(1)).default([]),
    platforms: z
      .array(
        z.object({
          platform: platformEnum,
          scheduledAt: z.string().datetime(),
          platformSpecific: z
            .object({
              instagramType: instagramTypeEnum.optional(),
              linkedinVisibility: linkedinVisibilityEnum.optional(),
              youtubePrivacy: youtubePrivacyEnum.optional(),
              whatsappType: whatsappTypeEnum.optional(),
            })
            .optional(),
        })
      )
      .min(1),
    tags: z.array(z.string()).default([]),
    campaignId: z.string().optional().nullable(),
    isRecurring: z.boolean().optional().default(false),
    recurringSchedule: z.string().optional().nullable(),
    aiGenerated: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.isRecurring) {
      const s = data.recurringSchedule?.trim();
      if (!s) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recurringSchedule"],
          message: "Required when isRecurring is true",
        });
        return;
      }
      const lower = s.toLowerCase();
      const ok =
        ["daily", "weekly", "monthly"].includes(lower) || /^p\d+d$/i.test(s);
      if (!ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recurringSchedule"],
          message: "Use daily, weekly, monthly, or PnD (e.g. P7D)",
        });
      }
    }
  });

export async function GET(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search")?.trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0);

  const q: Record<string, unknown> = {
    organizationId: auth.organizationId,
  };
  if (status && statusEnum.safeParse(status).success) {
    q["platforms.status"] = status;
  }
  if (platform && platformEnum.safeParse(platform).success) {
    q["platforms.platform"] = platform;
  }
  if (dateFrom || dateTo) {
    q["platforms.scheduledAt"] = {
      ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { $lte: new Date(dateTo) } : {}),
    };
  }
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    q.content = { $regex: escaped, $options: "i" };
  }

  const [items, total] = await Promise.all([
    ScheduledPost.find(q).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    ScheduledPost.countDocuments(q),
  ]);

  return jsonOk({
    items: items.map((post) => serializeScheduledPost(post as ScheduledPostAttrs)),
    total,
    skip,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const platforms = parsed.data.platforms.map((p) => p.platform as Platform);
  const agencyBlock = await enforceAgencyScheduledPostRules(auth.organizationId, platforms, {
    countNewPostTowardMonthlyLimit: true,
  });
  if (agencyBlock) return agencyBlock;

  const post = await ScheduledPost.create({
    organizationId: auth.organizationId,
    createdBy: auth.user._id,
    content: parsed.data.content,
    mediaUrls: parsed.data.mediaUrls,
    platforms: parsed.data.platforms.map((p) => ({
      platform: p.platform,
      status: "SCHEDULED",
      scheduledAt: new Date(p.scheduledAt),
      platformSpecific: p.platformSpecific ?? {},
    })),
    tags: parsed.data.tags,
    campaignId: parsed.data.campaignId ?? null,
    isRecurring: parsed.data.isRecurring,
    recurringSchedule: parsed.data.recurringSchedule ?? null,
    aiGenerated: parsed.data.aiGenerated,
  });

  return jsonOk(serializeScheduledPost(post.toObject() as ScheduledPostAttrs));
}
