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

const statusEnum = z.enum(ScheduledPostStatusValues as unknown as [string, ...string[]]);
const platformEnum = z.enum(PlatformValues as unknown as [string, ...string[]]);

const updateSchema = z
  .object({
    content: z.string().min(1).optional(),
    mediaUrls: z.array(z.string().min(1)).optional(),
    platforms: z
      .array(
        z.object({
          platform: platformEnum,
          status: statusEnum.optional(),
          scheduledAt: z.string().datetime(),
        })
      )
      .optional(),
    tags: z.array(z.string()).optional(),
    campaignId: z.string().optional().nullable(),
    isRecurring: z.boolean().optional(),
    recurringSchedule: z.string().optional().nullable(),
    aiGenerated: z.boolean().optional(),
  })
  .strict();

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  const post = await ScheduledPost.findOne({
    _id: ctx.params.id,
    organizationId: auth.organizationId,
  }).lean();
  if (!post) {
    return jsonError("Post not found", 404);
  }
  return jsonOk(serializeScheduledPost(post as ScheduledPostAttrs));
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const existing = await ScheduledPost.findOne({
    _id: ctx.params.id,
    organizationId: auth.organizationId,
  });
  if (!existing) {
    return jsonError("Post not found", 404);
  }
  if (existing.platforms.some((p) => p.status === "PUBLISHED")) {
    return jsonError("Published posts cannot be edited", 400);
  }

  const data = parsed.data;
  if (data.content !== undefined) existing.content = data.content;
  if (data.mediaUrls !== undefined) existing.mediaUrls = data.mediaUrls;
  if (data.tags !== undefined) existing.tags = data.tags;
  if (data.campaignId !== undefined) existing.campaignId = data.campaignId ?? null;
  if (data.isRecurring !== undefined) existing.isRecurring = data.isRecurring;
  if (data.recurringSchedule !== undefined) existing.recurringSchedule = data.recurringSchedule ?? null;
  if (data.aiGenerated !== undefined) existing.aiGenerated = data.aiGenerated;

  if (data.platforms !== undefined) {
    const platforms = data.platforms.map((p) => p.platform as Platform);
    const agencyBlock = await enforceAgencyScheduledPostRules(auth.organizationId, platforms, {
      countNewPostTowardMonthlyLimit: false,
    });
    if (agencyBlock) return agencyBlock;

    const nextPlatforms: ScheduledPostAttrs["platforms"] = data.platforms.map((p) => ({
      platform: p.platform as ScheduledPostAttrs["platforms"][number]["platform"],
      status: (p.status ?? "SCHEDULED") as ScheduledPostAttrs["platforms"][number]["status"],
      scheduledAt: new Date(p.scheduledAt),
      publishedAt: null,
      externalPostId: null,
      errorMessage: null,
      platformSpecific: {},
    }));
    existing.platforms = nextPlatforms;
  }

  await existing.save();
  return jsonOk(serializeScheduledPost(existing.toObject() as ScheduledPostAttrs));
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  const post = await ScheduledPost.findOne({
    _id: ctx.params.id,
    organizationId: auth.organizationId,
  }).lean();
  if (!post) {
    return jsonError("Post not found", 404);
  }
  if ((post as ScheduledPostAttrs).platforms.some((p) => p.status === "PUBLISHED")) {
    return jsonError("Published posts cannot be deleted", 400);
  }

  await ScheduledPost.deleteOne({ _id: ctx.params.id, organizationId: auth.organizationId });
  return jsonOk({ ok: true });
}
