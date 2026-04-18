import { AgencyClientRelation, OrganizationMember, User, connectMongo } from "@helloadd/database";
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

  const rows = await OrganizationMember.find({ organizationId: clientOrgId }).lean();
  const userIds = rows.map((r) => r.userId);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const byId = new Map(users.map((u) => [u._id, u]));

  const members = rows.map((m) => {
    const u = byId.get(m.userId);
    return {
      memberId: m._id,
      userId: m.userId,
      role: m.role,
      name: u?.name ?? "Unknown",
      email: u?.email ?? "",
    };
  });

  return jsonOk({ members });
}
