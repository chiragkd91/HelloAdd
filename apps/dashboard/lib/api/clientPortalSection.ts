import { Organization, connectMongo } from "@helloadd/database";

export type ClientPortalSection = "overview" | "campaigns" | "reports";

/** True when agency branding disables this section (clients must not access). */
export async function isClientPortalSectionDisabled(
  agencyOrgId: string,
  section: ClientPortalSection,
): Promise<boolean> {
  await connectMongo();
  const agency = await Organization.findById(agencyOrgId).lean();
  if (!agency) return true;
  const b = agency.settings?.clientPortalBranding as
    | { showOverview?: boolean; showCampaigns?: boolean; showReports?: boolean }
    | undefined;
  switch (section) {
    case "overview":
      return b?.showOverview === false;
    case "campaigns":
      return b?.showCampaigns === false;
    case "reports":
      return b?.showReports === false;
  }
}
