import { OrganizationMember, connectMongo } from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";
import type { AppRouteCtx } from "@/lib/api/routeContext";

const assignableRoles = ["ADMIN", "MANAGER", "VIEWER"] as const;

const bodySchema = z.object({
  role: z.enum(assignableRoles),
});

type Ctx = AppRouteCtx<{ memberId: string }>;

/**
 * Change a member's org role (ADMIN / MANAGER / VIEWER only).
 * Cannot modify the OWNER row via this endpoint.
 */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserOrgRole(req, "ADMIN");
  if (!auth.ok) return auth.response;

  const { memberId: rawMemberId } = await ctx.params;
  const memberId = rawMemberId?.trim();
  if (!memberId) {
    return jsonError("Missing member id", 400);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const row = await OrganizationMember.findOne({
    _id: memberId,
    organizationId: auth.organizationId,
  }).lean();

  if (!row) {
    return jsonError("Member not found", 404);
  }

  if (row.role === "OWNER") {
    return jsonError("Cannot change the organization owner role here", 400);
  }

  await OrganizationMember.updateOne(
    { _id: memberId, organizationId: auth.organizationId },
    { $set: { role: parsed.data.role } }
  );

  return jsonOk({ ok: true, role: parsed.data.role });
}
