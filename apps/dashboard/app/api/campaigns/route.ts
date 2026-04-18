import {
  AdStatusValues,
  Campaign,
  Integration,
  PlatformValues,
  type Platform,
} from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  enforceAgencyAllowedPlatforms,
  enforceAgencyCampaignLimit,
} from "@/lib/agency/agencyPlanEnforcement";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";
import { requireUserOrgRole } from "@/lib/auth/rbac";

const platformEnum = z.enum(PlatformValues as unknown as [string, ...string[]]);
const statusEnum = z.enum(AdStatusValues as unknown as [string, ...string[]]);

const createSchema = z.object({
  integrationId: z.string().min(1),
  externalId: z.string().min(1),
  name: z.string().min(1),
  platform: platformEnum,
  product: z.string().optional().nullable(),
  status: statusEnum,
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  budgetTotal: z.number().nonnegative(),
  budgetSpent: z.number().nonnegative().optional(),
  impressions: z.number().nonnegative().optional(),
  clicks: z.number().nonnegative().optional(),
  conversions: z.number().nonnegative().optional(),
  ctr: z.number().optional(),
  cpc: z.number().optional(),
  region: z.string().optional().nullable(),
});

function serializeCampaign(c: {
  _id: string;
  organizationId: string;
  integrationId: string;
  externalId: string;
  name: string;
  platform: string;
  product?: string | null;
  status: string;
  startDate: Date;
  endDate?: Date | null;
  budgetTotal: number;
  budgetSpent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  region?: string | null;
  errorType: string;
  errorMessage?: string | null;
  lastSyncedAt?: Date | null;
}) {
  return {
    id: c._id,
    organizationId: c.organizationId,
    integrationId: c.integrationId,
    externalId: c.externalId,
    name: c.name,
    platform: c.platform,
    product: c.product ?? null,
    status: c.status,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate ? c.endDate.toISOString() : null,
    budgetTotal: c.budgetTotal,
    budgetSpent: c.budgetSpent,
    impressions: c.impressions,
    clicks: c.clicks,
    conversions: c.conversions,
    ctr: c.ctr,
    cpc: c.cpc,
    region: c.region ?? null,
    errorType: c.errorType,
    errorMessage: c.errorMessage ?? null,
    lastSyncedAt: c.lastSyncedAt ? c.lastSyncedAt.toISOString() : null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const platform = searchParams.get("platform") ?? undefined;
  const searchRaw = searchParams.get("search")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0);

  const q: Record<string, unknown> = { organizationId: auth.organizationId };
  if (status) q.status = status;
  if (platform) q.platform = platform;
  if (searchRaw.length > 0) {
    const escaped = searchRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    q.name = { $regex: escaped, $options: "i" };
  }

  const [items, total] = await Promise.all([
    Campaign.find(q).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Campaign.countDocuments(q),
  ]);

  return jsonOk({
    items: items.map((c) => serializeCampaign(c as Parameters<typeof serializeCampaign>[0])),
    total,
    skip,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;
  const integration = await Integration.findOne({
    _id: data.integrationId,
    organizationId: auth.organizationId,
  }).lean();

  if (!integration) {
    return jsonError("Integration not found for this organization", 404);
  }

  const agencyCap = await enforceAgencyCampaignLimit(auth.organizationId);
  if (agencyCap) return agencyCap;

  const agencyPlat = await enforceAgencyAllowedPlatforms(auth.organizationId, [
    data.platform as Platform,
  ]);
  if (agencyPlat) return agencyPlat;

  const startDate = new Date(data.startDate);
  const endDate = data.endDate ? new Date(data.endDate) : null;

  const created = await Campaign.create({
    organizationId: auth.organizationId,
    integrationId: data.integrationId,
    externalId: data.externalId,
    name: data.name,
    platform: data.platform,
    product: data.product ?? null,
    status: data.status,
    startDate,
    endDate,
    budgetTotal: data.budgetTotal,
    budgetSpent: data.budgetSpent ?? 0,
    impressions: data.impressions ?? 0,
    clicks: data.clicks ?? 0,
    conversions: data.conversions ?? 0,
    ctr: data.ctr ?? 0,
    cpc: data.cpc ?? 0,
    region: data.region ?? null,
    errorType: "NONE",
  });

  const c = created.toObject();
  return jsonOk(serializeCampaign(c as Parameters<typeof serializeCampaign>[0]));
}
