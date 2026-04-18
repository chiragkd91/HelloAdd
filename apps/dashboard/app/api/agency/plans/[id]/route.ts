import {
  AgencyPlan,
  Organization,
  connectMongo,
  AgencyPlanBillingCycleValues,
  PlatformValues,
  type AgencyPlanBillingCycle,
  type Platform,
} from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonError, jsonOk } from "@/lib/api/http";
import type { AppRouteCtx } from "@/lib/api/routeContext";

const featuresSchema = z.object({
  postScheduling: z.boolean().optional(),
  adTracking: z.boolean().optional(),
  aiCredits: z.number().int().nonnegative().optional(),
  reviewManagement: z.boolean().optional(),
  leadCapture: z.boolean().optional(),
  whatsappAlerts: z.boolean().optional(),
  whatsappScheduling: z.boolean().optional(),
  unifiedInbox: z.boolean().optional(),
  advancedReports: z.boolean().optional(),
  bulkScheduling: z.boolean().optional(),
});

const limitsSchema = z.object({
  socialAccounts: z.number().int(),
  campaigns: z.number().int(),
  teamMembers: z.number().int(),
  scheduledPostsPerMonth: z.number().int(),
});

const putSchema = z.object({
  planName: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  allowedPlatforms: z.array(z.enum(PlatformValues)).optional(),
  features: featuresSchema.optional(),
  monthlyPrice: z.number().nonnegative().optional(),
  currency: z.string().max(8).optional(),
  billingCycle: z.enum(AgencyPlanBillingCycleValues).optional(),
  limits: limitsSchema.optional(),
  isActive: z.boolean().optional(),
});

type Ctx = AppRouteCtx<{ id: string }>;

export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;

  const { id: rawId } = await ctx.params;
  const id = rawId?.trim();
  if (!id) return jsonError("Missing plan id", 400);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  await connectMongo();
  const existing = await AgencyPlan.findOne({
    _id: id,
    agencyOrgId: auth.organizationId,
  }).lean();
  if (!existing) {
    return jsonError("Plan not found", 404);
  }

  const $set: Record<string, unknown> = { updatedAt: new Date() };
  const d = parsed.data;
  if (d.planName !== undefined) $set.planName = d.planName.trim();
  if (d.description !== undefined) $set.description = d.description.trim();
  if (d.allowedPlatforms !== undefined) $set.allowedPlatforms = d.allowedPlatforms;
  if (d.monthlyPrice !== undefined) $set.monthlyPrice = d.monthlyPrice;
  if (d.currency !== undefined) $set.currency = d.currency.trim();
  if (d.billingCycle !== undefined) $set.billingCycle = d.billingCycle;
  if (d.limits !== undefined) $set.limits = d.limits;
  if (d.isActive !== undefined) $set.isActive = d.isActive;
  if (d.features !== undefined) {
    $set.features = { ...existing.features, ...d.features };
  }

  const doc = await AgencyPlan.findOneAndUpdate(
    { _id: id, agencyOrgId: auth.organizationId },
    { $set },
    { new: true },
  ).lean();
  if (!doc) return jsonError("Plan not found", 404);

  return jsonOk({
    id: doc._id,
    planName: doc.planName,
    description: doc.description,
    allowedPlatforms: doc.allowedPlatforms as Platform[],
    features: doc.features,
    monthlyPrice: doc.monthlyPrice,
    currency: doc.currency,
    billingCycle: doc.billingCycle as AgencyPlanBillingCycle,
    limits: doc.limits,
    isActive: doc.isActive,
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;

  const { id: rawId } = await ctx.params;
  const id = rawId?.trim();
  if (!id) return jsonError("Missing plan id", 400);

  await connectMongo();
  const plan = await AgencyPlan.findOne({
    _id: id,
    agencyOrgId: auth.organizationId,
  }).lean();
  if (!plan) {
    return jsonError("Plan not found", 404);
  }

  const assigned = await Organization.countDocuments({ assignedPlanId: id });
  if (assigned > 0) {
    return jsonError(`Cannot delete plan: ${assigned} client(s) still assigned`, 409);
  }

  await AgencyPlan.deleteOne({ _id: id, agencyOrgId: auth.organizationId });
  return jsonOk({ ok: true });
}
