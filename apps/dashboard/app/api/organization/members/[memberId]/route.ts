import {
  OrganizationMember,
  connectMongo,
} from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

type Ctx = { params: { memberId: string } };

/**
 * Remove a member from the workspace. OWNER rows cannot be removed here.
 * Requires ADMIN or OWNER (Task 1.3).
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserOrgRole(req, "ADMIN");
  if (!auth.ok) return auth.response;

  const memberId = ctx.params.memberId?.trim();
  if (!memberId) {
    return jsonError("Missing member id", 400);
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
    return jsonError("Cannot remove the organization owner", 400);
  }

  await OrganizationMember.deleteOne({ _id: memberId, organizationId: auth.organizationId });

  return jsonOk({ ok: true });
}
