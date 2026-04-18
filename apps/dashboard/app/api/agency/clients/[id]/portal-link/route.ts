import { AgencyClientRelation, connectMongo } from "@helloadd/database";
import { NextRequest } from "next/server";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonError, jsonOk } from "@/lib/api/http";
import { signClientPortalToken } from "@/lib/clientPortal/token";
import type { AppRouteCtx } from "@/lib/api/routeContext";

type Ctx = AppRouteCtx<{ id: string }>;

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;

  const { id: clientOrgId } = await ctx.params;
  if (!clientOrgId) {
    return jsonError("Missing client id", 400);
  }

  await connectMongo();
  const rel = await AgencyClientRelation.findOne({
    agencyOrgId: auth.organizationId,
    clientOrgId,
    status: "ACTIVE",
  }).lean();

  if (!rel) {
    return jsonError("Active client relation not found", 404);
  }

  let token: string;
  try {
    token = signClientPortalToken({
      clientOrgId,
      agencyOrgId: auth.organizationId,
      expiresInSeconds: 30 * 24 * 60 * 60,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Token error";
    return jsonError(msg, 500);
  }

  const base = new URL(req.url).origin;
  const url = `${base}/client/activate?token=${encodeURIComponent(token)}`;

  return jsonOk({ url, expiresInDays: 30 });
}
