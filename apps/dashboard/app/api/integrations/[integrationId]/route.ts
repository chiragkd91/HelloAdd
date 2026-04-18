import { Integration, connectMongo } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

type Ctx = { params: { integrationId: string } };

/** Remove a connected integration for the current workspace. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  const integrationId = ctx.params.integrationId;
  if (!integrationId) return jsonError("Missing integration id", 400);

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const r = await Integration.deleteOne({
    _id: integrationId,
    organizationId: auth.organizationId,
  });
  if (r.deletedCount === 0) {
    return jsonError("Integration not found", 404);
  }
  return jsonOk({ ok: true });
}

