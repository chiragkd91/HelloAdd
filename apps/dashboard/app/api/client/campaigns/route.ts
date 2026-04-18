import { Campaign, Organization, connectMongo } from "@helloadd/database";
import { NextRequest } from "next/server";
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

  if (await isClientPortalSectionDisabled(p.agencyOrgId, "campaigns")) {
    return jsonError("Forbidden", 403);
  }

  const campaigns = await Campaign.find({ organizationId: orgId }).sort({ createdAt: -1 }).lean();

  return jsonOk({
    campaigns: campaigns.map((c) => ({
      id: c._id,
      name: c.name,
      platform: c.platform,
      status: c.status,
      budgetSpent: c.budgetSpent,
      budgetTotal: c.budgetTotal,
      impressions: c.impressions,
      clicks: c.clicks,
      ctr: c.ctr,
      conversions: c.conversions,
      startDate: c.startDate,
    })),
  });
}
