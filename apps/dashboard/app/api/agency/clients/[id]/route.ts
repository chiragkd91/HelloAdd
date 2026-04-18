import {
  AgencyClientRelation,
  Alert,
  Campaign,
  Organization,
  OrganizationMember,
  User,
  connectMongo,
} from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { aggregateCampaignMetrics, countCampaignsByStatus } from "@/lib/agency/clientMetrics";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonError, jsonOk } from "@/lib/api/http";

type Ctx = { params: { id: string } };

const patchSchema = z
  .object({
    notes: z.union([z.string(), z.null()]).optional(),
    contactName: z.union([z.string(), z.null()]).optional(),
    contactPhone: z.union([z.string(), z.null()]).optional(),
    contactEmail: z.union([z.string(), z.null()]).optional(),
    tradeName: z.union([z.string(), z.null()]).optional(),
    contractValue: z.number().nonnegative().optional(),
    status: z.enum(["ACTIVE", "PAUSED", "ENDED"]).optional(),
    assignedAM: z.union([z.string().min(1), z.null()]).optional(),
    assignedCM: z.union([z.string().min(1), z.null()]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

function strOrNull(v: string | null | undefined) {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

async function resolveUsers(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, { id: string; name: string; email: string }>();
  const users = await User.find({ _id: { $in: ids } }).lean();
  return new Map(
    users.map((u) => [
      u._id,
      { id: u._id, name: u.name ?? "Unknown", email: u.email ?? "" },
    ]),
  );
}

async function assertAgencyMember(agencyOrgId: string, userId: string) {
  const m = await OrganizationMember.findOne({ organizationId: agencyOrgId, userId }).lean();
  return Boolean(m);
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;

  const clientOrgId = ctx.params.id;
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

  const org = await Organization.findById(clientOrgId).lean();
  if (!org) {
    return jsonError("Organization missing", 404);
  }

  const agencyOrg = await Organization.findById(auth.organizationId).select("name").lean();

  const assigneeIds = [rel.assignedAM, rel.assignedCM].filter(Boolean) as string[];
  const assigneeMap = await resolveUsers(assigneeIds);

  const campaigns = await Campaign.find({ organizationId: clientOrgId }).lean();
  const metrics = aggregateCampaignMetrics(campaigns);
  const statusCounts = countCampaignsByStatus(campaigns);
  const alertCount = await Alert.countDocuments({ organizationId: clientOrgId, isRead: false });

  return jsonOk({
    agencyName: agencyOrg?.name ?? null,
    relation: {
      contractValue: rel.contractValue,
      contractCurrency: rel.contractCurrency,
      status: rel.status,
      startDate: rel.startDate,
      notes: rel.notes ?? null,
      contactName: rel.contactName ?? null,
      contactPhone: rel.contactPhone ?? null,
      contactEmail: rel.contactEmail ?? null,
      tradeName: rel.tradeName ?? null,
      assignedAM: rel.assignedAM ?? null,
      assignedCM: rel.assignedCM ?? null,
      assignedAMUser: rel.assignedAM ? (assigneeMap.get(rel.assignedAM) ?? null) : null,
      assignedCMUser: rel.assignedCM ? (assigneeMap.get(rel.assignedCM) ?? null) : null,
    },
    organization: {
      id: org._id,
      name: org.name,
      slug: org.slug,
      industry: org.industry ?? null,
      logoUrl: org.logoUrl ?? null,
      plan: org.plan,
      aiHealthScore: org.aiHealthScore ?? null,
      aiHealthLabel: org.aiHealthLabel ?? null,
      createdAt: org.createdAt.toISOString(),
    },
    metrics: {
      ...metrics,
      alertCount,
      adsLive: statusCounts.live,
      adsPaused: statusCounts.paused,
      adsEnded: statusCounts.ended,
      adsDraft: statusCounts.draft,
      adsTotal: statusCounts.total,
    },
    campaigns: campaigns.map((c) => ({
      id: c._id,
      name: c.name,
      platform: c.platform,
      status: c.status,
      budgetSpent: c.budgetSpent,
      budgetTotal: c.budgetTotal,
      impressions: c.impressions,
      clicks: c.clicks,
      conversions: c.conversions,
      ctr: c.ctr,
      errorType: c.errorType,
      startDate: c.startDate,
    })),
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;

  const clientOrgId = ctx.params.id;
  if (!clientOrgId) {
    return jsonError("Missing client id", 400);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  await connectMongo();

  const rel = await AgencyClientRelation.findOne({
    agencyOrgId: auth.organizationId,
    clientOrgId,
  });

  if (!rel) {
    return jsonError("Client not found for this agency", 404);
  }

  const agencyId = auth.organizationId;
  const p = parsed.data;

  if (p.assignedAM !== undefined && p.assignedAM !== null) {
    const ok = await assertAgencyMember(agencyId, p.assignedAM);
    if (!ok) return jsonError("Account manager must be a user in your agency workspace", 400);
  }
  if (p.assignedCM !== undefined && p.assignedCM !== null) {
    const ok = await assertAgencyMember(agencyId, p.assignedCM);
    if (!ok) return jsonError("Campaign manager must be a user in your agency workspace", 400);
  }

  if (p.notes !== undefined) {
    rel.notes = p.notes === null ? null : strOrNull(p.notes);
  }
  if (p.contactName !== undefined) rel.contactName = strOrNull(p.contactName);
  if (p.contactPhone !== undefined) rel.contactPhone = strOrNull(p.contactPhone);
  if (p.contactEmail !== undefined) rel.contactEmail = strOrNull(p.contactEmail);
  if (p.tradeName !== undefined) rel.tradeName = strOrNull(p.tradeName);
  if (p.contractValue !== undefined) rel.contractValue = p.contractValue;
  if (p.status !== undefined) rel.status = p.status;
  if (p.assignedAM !== undefined) rel.assignedAM = p.assignedAM;
  if (p.assignedCM !== undefined) rel.assignedCM = p.assignedCM;

  await rel.save();

  return jsonOk({ ok: true });
}
