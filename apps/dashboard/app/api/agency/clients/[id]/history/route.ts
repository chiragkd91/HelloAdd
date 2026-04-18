import { AgencyClientRelation, Alert, connectMongo } from "@helloadd/database";
import { NextRequest } from "next/server";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonError, jsonOk } from "@/lib/api/http";
import type { AppRouteCtx } from "@/lib/api/routeContext";

type Ctx = AppRouteCtx<{ id: string }>;

export async function GET(req: NextRequest, ctx: Ctx) {
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
  }).lean();

  if (!rel) {
    return jsonError("Client not found for this agency", 404);
  }

  const alerts = await Alert.find({ organizationId: clientOrgId })
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();

  return jsonOk({
    items: alerts.map((a) => ({
      id: a._id,
      type: a.type,
      title: a.title,
      message: a.message,
      severity: a.severity,
      isRead: a.isRead,
      campaignId: a.campaignId ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
