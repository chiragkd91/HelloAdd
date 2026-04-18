import { Campaign } from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";
import { requireUserOrgRole } from "@/lib/auth/rbac";
import type { AppRouteCtx } from "@/lib/api/routeContext";

const patchSchema = z
  .object({
    name: z.string().min(1).optional(),
    status: z.string().optional(),
    budgetTotal: z.number().nonnegative().optional(),
    budgetSpent: z.number().nonnegative().optional(),
    impressions: z.number().nonnegative().optional(),
    clicks: z.number().nonnegative().optional(),
    ctr: z.number().optional(),
    endDate: z.string().optional().nullable(),
  })
  .strict();

function serialize(c: {
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

type Ctx = AppRouteCtx<{ id: string }>;

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireUserAndOrg(_req);
  if (!auth.ok) return auth.response;

  const { id: campaignId } = await ctx.params;
  const c = await Campaign.findOne({
    _id: campaignId,
    organizationId: auth.organizationId,
  }).lean();

  if (!c) {
    return jsonError("Campaign not found", 404);
  }

  return jsonOk(serialize(c as Parameters<typeof serialize>[0]));
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  const { id: campaignId } = await ctx.params;
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

  const setDoc: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.name !== undefined) setDoc.name = d.name;
  if (d.status !== undefined) setDoc.status = d.status;
  if (d.budgetTotal !== undefined) setDoc.budgetTotal = d.budgetTotal;
  if (d.budgetSpent !== undefined) setDoc.budgetSpent = d.budgetSpent;
  if (d.impressions !== undefined) setDoc.impressions = d.impressions;
  if (d.clicks !== undefined) setDoc.clicks = d.clicks;
  if (d.ctr !== undefined) setDoc.ctr = d.ctr;
  if (d.endDate !== undefined) {
    setDoc.endDate = d.endDate ? new Date(d.endDate) : null;
  }

  const c = await Campaign.findOneAndUpdate(
    { _id: campaignId, organizationId: auth.organizationId },
    { $set: setDoc },
    { new: true }
  ).lean();

  if (!c) {
    return jsonError("Campaign not found", 404);
  }

  return jsonOk(serialize(c as Parameters<typeof serialize>[0]));
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireUserOrgRole(_req, "MANAGER");
  if (!auth.ok) return auth.response;

  const { id: campaignId } = await ctx.params;
  const r = await Campaign.deleteOne({
    _id: campaignId,
    organizationId: auth.organizationId,
  });

  if (r.deletedCount === 0) {
    return jsonError("Campaign not found", 404);
  }

  return jsonOk({ ok: true });
}
