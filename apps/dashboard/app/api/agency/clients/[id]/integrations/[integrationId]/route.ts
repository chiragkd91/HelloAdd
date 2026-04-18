import { Integration, connectMongo } from "@helloadd/database";
import { NextRequest } from "next/server";
import { loadAgencyClient } from "@/lib/api/agencyClientAccess";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonError, jsonOk } from "@/lib/api/http";

type Ctx = { params: { id: string; integrationId: string } };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;

  const clientOrgId = ctx.params.id;
  const integrationId = ctx.params.integrationId;
  if (!clientOrgId || !integrationId) return jsonError("Missing id", 400);

  const bundle = await loadAgencyClient(auth.organizationId, clientOrgId);
  if (!bundle) return jsonError("Client not found", 404);

  await connectMongo();
  const r = await Integration.deleteOne({
    _id: integrationId,
    organizationId: clientOrgId,
  });

  if (r.deletedCount === 0) {
    return jsonError("Integration not found", 404);
  }

  return jsonOk({ ok: true });
}
