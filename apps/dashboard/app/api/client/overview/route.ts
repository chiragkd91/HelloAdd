import { Alert, Campaign, Organization, connectMongo } from "@helloadd/database";
import { NextRequest } from "next/server";
import { aggregateCampaignMetrics } from "@/lib/agency/clientMetrics";
import { jsonError, jsonOk } from "@/lib/api/http";
import { getClientPortalPayload } from "@/lib/api/clientPortalSession";
import { isClientPortalSectionDisabled } from "@/lib/api/clientPortalSection";

export async function GET(req: NextRequest) {
  const p = getClientPortalPayload(req);
  if (!p) {
    return jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId || orgId !== p.clientOrgId) {
    return jsonError("Forbidden", 403);
  }

  await connectMongo();
  const org = await Organization.findById(orgId).lean();
  if (!org || org.parentAgencyId !== p.agencyOrgId) {
    return jsonError("Not found", 404);
  }

  if (await isClientPortalSectionDisabled(p.agencyOrgId, "overview")) {
    return jsonError("Forbidden", 403);
  }

  const campaigns = await Campaign.find({ organizationId: orgId }).lean();
  const metrics = aggregateCampaignMetrics(campaigns);
  const openAlerts = await Alert.countDocuments({ organizationId: orgId, isRead: false });

  return jsonOk({
    organization: {
      name: org.name,
      industry: org.industry ?? null,
    },
    metrics: {
      ...metrics,
      openAlerts,
    },
    platforms: metrics.platforms,
  });
}
