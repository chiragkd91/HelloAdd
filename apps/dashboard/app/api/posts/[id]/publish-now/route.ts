import { ScheduledPost } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";
import { publishPostById } from "@/lib/scheduler/publisher";
import type { AppRouteCtx } from "@/lib/api/routeContext";

type Ctx = AppRouteCtx<{ id: string }>;

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  const { id: postId } = await ctx.params;
  const post = await ScheduledPost.findOne({
    _id: postId,
    organizationId: auth.organizationId,
  }).lean();
  if (!post) {
    return jsonError("Post not found", 404);
  }

  await ScheduledPost.updateOne(
    { _id: postId, organizationId: auth.organizationId },
    { $set: { "platforms.$[p].scheduledAt": new Date() } },
    { arrayFilters: [{ "p.status": "SCHEDULED" }] }
  );

  const result = await publishPostById(postId);
  return jsonOk(result);
}
