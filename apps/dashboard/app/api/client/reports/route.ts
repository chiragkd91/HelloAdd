import { Organization, Report, connectMongo } from "@helloadd/database";
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

  if (await isClientPortalSectionDisabled(p.agencyOrgId, "reports")) {
    return jsonError("Forbidden", 403);
  }

  const reports = await Report.find({ organizationId: orgId }).sort({ createdAt: -1 }).limit(50).lean();

  return jsonOk({
    reports: reports.map((r) => ({
      id: r._id,
      reportType: r.reportType,
      status: r.status,
      createdAt: r.createdAt,
      dateFrom: r.dateFrom ?? null,
      dateTo: r.dateTo ?? null,
    })),
  });
}
