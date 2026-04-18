import { ScheduledPost } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";
import { publishPostById } from "@/lib/scheduler/publisher";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  const post = await ScheduledPost.findOne({
    _id: ctx.params.id,
    organizationId: auth.organizationId,
  }).lean();
  if (!post) {
    return jsonError("Post not found", 404);
  }

  await ScheduledPost.updateOne(
    { _id: ctx.params.id, organizationId: auth.organizationId },
    { $set: { "platforms.$[p].scheduledAt": new Date() } },
    { arrayFilters: [{ "p.status": "SCHEDULED" }] }
  );

  const result = await publishPostById(ctx.params.id);
  return jsonOk(result);
}
