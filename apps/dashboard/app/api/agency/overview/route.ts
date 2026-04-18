import {
  AgencyClientRelation,
  Alert,
  Campaign,
  Organization,
  connectMongo,
} from "@helloadd/database";
import { NextRequest } from "next/server";
import {
  aggregateCampaignMetrics,
  countCampaignsByStatus,
  healthLabelToBadge,
} from "@/lib/agency/clientMetrics";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonOk } from "@/lib/api/http";

export async function GET(req: NextRequest) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;

  await connectMongo();

  const agencyOrg = await Organization.findById(auth.organizationId).select("name").lean();
  const agencyName = agencyOrg?.name ?? "Agency";

  const rels = await AgencyClientRelation.find({
    agencyOrgId: auth.organizationId,
    status: "ACTIVE",
  }).lean();

  const relByClientId = new Map(rels.map((r) => [r.clientOrgId, r]));

  const clientIds = rels.map((r) => r.clientOrgId);
  if (clientIds.length === 0) {
    return jsonOk({
      agencyName,
      totalSpend: 0,
      totalLeads: 0,
      avgCTR: 0,
      issueCount: 0,
      activeCampaigns: 0,
      clients: [] as Array<{
        id: string;
        name: string;
        industry: string | null;
        health: string;
        spend: number;
        platforms: Array<{ platform: string; ctr: number }>;
        issues: number;
      }>,
      byPlatform: [] as Array<{ platform: string; clientName: string; clientId: string; spend: number; ctr: number }>,
    });
  }

  const orgs = await Organization.find({ _id: { $in: clientIds } }).lean();
  const orgById = new Map(orgs.map((o) => [o._id, o]));

  const allCampaigns = await Campaign.find({ organizationId: { $in: clientIds } }).lean();
  const campaignsByOrg = new Map<string, typeof allCampaigns>();
  for (const c of allCampaigns) {
    const list = campaignsByOrg.get(c.organizationId) ?? [];
    list.push(c);
    campaignsByOrg.set(c.organizationId, list);
  }

  const global = aggregateCampaignMetrics(allCampaigns);
  const alertIssues = await Alert.countDocuments({
    organizationId: { $in: clientIds },
    isRead: false,
  });

  const activeCampaigns = allCampaigns.filter((c) => c.status === "LIVE").length;

  const clients = clientIds.map((id) => {
    const org = orgById.get(id);
    const rel = relByClientId.get(id);
    const camps = campaignsByOrg.get(id) ?? [];
    const m = aggregateCampaignMetrics(camps);
    const counts = countCampaignsByStatus(camps);
    const health = healthLabelToBadge(org?.aiHealthLabel ?? null);
    return {
      id,
      name: org?.name ?? "Unknown",
      industry: org?.industry ?? null,
      health,
      spend: m.totalSpend,
      platforms: m.platforms,
      issues: m.issueCount + 0,
      adsLive: counts.live,
      adsPaused: counts.paused,
      adsTotal: counts.total,
      contactName: rel?.contactName ?? null,
      contactPhone: rel?.contactPhone ?? null,
      contactEmail: rel?.contactEmail ?? null,
      tradeName: rel?.tradeName ?? null,
    };
  });

  const byPlatform: Array<{
    platform: string;
    clientName: string;
    clientId: string;
    spend: number;
    ctr: number;
  }> = [];

  for (const id of clientIds) {
    const org = orgById.get(id);
    const camps = campaignsByOrg.get(id) ?? [];
    const m = aggregateCampaignMetrics(camps);
    for (const p of m.platforms) {
      byPlatform.push({
        platform: p.platform,
        clientName: org?.name ?? "Unknown",
        clientId: id,
        spend: p.spend,
        ctr: p.ctr,
      });
    }
  }

  byPlatform.sort((a, b) => a.platform.localeCompare(b.platform) || a.clientName.localeCompare(b.clientName));

  return jsonOk({
    agencyName,
    totalSpend: global.totalSpend,
    totalLeads: global.totalLeads,
    avgCTR: global.avgCTR,
    issueCount: global.issueCount + alertIssues,
    activeCampaigns,
    clients,
    byPlatform,
  });
}
