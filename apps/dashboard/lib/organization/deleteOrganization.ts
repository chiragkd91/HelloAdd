import {
  AgencyClientRelation,
  AIUsageLog,
  Alert,
  Budget,
  Campaign,
  CampaignMetric,
  connectMongo,
  Integration,
  Organization,
  OrganizationInvite,
  OrganizationMember,
  Report,
  Session,
} from "@helloadd/database";

/**
 * Permanently removes org-scoped data, then the organization document.
 * Call only after business-rule checks (subscription, agency links, etc.).
 *
 * **Mongo collections touched (audit):**
 * - `campaign_metrics` (by campaign ids for this org)
 * - `campaigns`, `integrations`, `alerts`, `reports`, `budgets`, `organization_invites`
 * - `ai_usage_logs`, `agency_client_relations` (agency or client links)
 * - `organization_members`
 * - `sessions` — deleted only for users who have **no other** org membership (so they are not left with a cookie for a deleted org)
 * - `organizations` (this doc)
 *
 * **Not org-scoped (no delete here):** `users`, `sessions` for multi-org users, global `market_trends`.
 * Client portal branding lives on `organizations.settings`; removed with the org.
 */
async function deleteSessionsForUsersOnlyInOrg(organizationId: string): Promise<void> {
  const members = await OrganizationMember.find({ organizationId }).select("userId").lean();
  const userIds = [...new Set(members.map((m) => m.userId))];
  for (const userId of userIds) {
    const otherOrgs = await OrganizationMember.countDocuments({
      userId,
      organizationId: { $ne: organizationId },
    });
    if (otherOrgs === 0) {
      await Session.deleteMany({ userId });
    }
  }
}

export async function deleteOrganizationCascade(organizationId: string): Promise<void> {
  await connectMongo();

  const campaigns = await Campaign.find({ organizationId }).select("_id").lean();
  const campaignIds = campaigns.map((c) => c._id);
  if (campaignIds.length > 0) {
    await CampaignMetric.deleteMany({ campaignId: { $in: campaignIds } });
  }

  await Promise.all([
    Campaign.deleteMany({ organizationId }),
    Integration.deleteMany({ organizationId }),
    Alert.deleteMany({ organizationId }),
    Report.deleteMany({ organizationId }),
    Budget.deleteMany({ organizationId }),
    OrganizationInvite.deleteMany({ organizationId }),
    AIUsageLog.deleteMany({ organizationId }),
    AgencyClientRelation.deleteMany({
      $or: [{ agencyOrgId: organizationId }, { clientOrgId: organizationId }],
    }),
  ]);

  await deleteSessionsForUsersOnlyInOrg(organizationId);

  await OrganizationMember.deleteMany({ organizationId });

  const r = await Organization.deleteOne({ _id: organizationId });
  if (r.deletedCount === 0) {
    throw new Error("ORG_DELETE_FAILED");
  }
}
