import { Organization, connectMongo } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { getClientPortalPayload } from "@/lib/api/clientPortalSession";

export async function GET(req: NextRequest) {
  const p = getClientPortalPayload(req);
  if (!p) {
    return jsonError("Unauthorized", 401);
  }

  await connectMongo();
  const agency = await Organization.findById(p.agencyOrgId).lean();
  if (!agency) {
    return jsonError("Agency not found", 404);
  }

  const b = agency.settings?.clientPortalBranding;
  const displayName = b?.displayName?.trim() || agency.name;
  const primaryColor = b?.primaryColor?.trim() || "#0ea5e9";
  const colorScheme = b?.colorScheme === "DARK" || b?.colorScheme === "CUSTOM" ? b.colorScheme : "LIGHT";
  const backgroundColor =
    colorScheme === "DARK"
      ? b?.backgroundColor?.trim() || "#0a0f1a"
      : colorScheme === "CUSTOM"
        ? b?.backgroundColor?.trim() || "#f8fafc"
        : "#f8fafc";
  const textColor =
    colorScheme === "DARK"
      ? b?.textColor?.trim() || "#e5e7eb"
      : colorScheme === "CUSTOM"
        ? b?.textColor?.trim() || "#0f172a"
        : "#0f172a";
  const logoUrl = b?.logoUrl?.trim() || agency.logoUrl || null;

  return jsonOk({
    displayName,
    primaryColor,
    colorScheme,
    backgroundColor,
    textColor,
    logoUrl,
    showOverview: b?.showOverview !== false,
    showCampaigns: b?.showCampaigns !== false,
    showReports: b?.showReports !== false,
    clientOrgId: p.clientOrgId,
  });
}
