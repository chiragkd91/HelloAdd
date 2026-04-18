import { ScheduledPost, type ScheduledPostAttrs } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";
import { refreshPostEngagement } from "@/lib/scheduler/postEngagement";
import { serializeScheduledPost } from "@/lib/scheduler/serializeScheduledPost";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  try {
    await refreshPostEngagement(ctx.params.id, auth.organizationId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "POST_NOT_FOUND") {
      return jsonError("Post not found", 404);
    }
    console.error("[POST /api/posts/:id/engagement]", e);
    return jsonError("Could not refresh engagement", 500);
  }

  const post = await ScheduledPost.findOne({
    _id: ctx.params.id,
    organizationId: auth.organizationId,
  }).lean();
  if (!post) {
    return jsonError("Post not found", 404);
  }
  return jsonOk(serializeScheduledPost(post as ScheduledPostAttrs));
}
