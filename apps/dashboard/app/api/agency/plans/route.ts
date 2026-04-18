import {
  AgencyPlan,
  Organization,
  connectMongo,
  AgencyPlanBillingCycleValues,
  PlatformValues,
  type AgencyPlanAttrs,
  type AgencyPlanBillingCycle,
  type Platform,
} from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/rbac";

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

const planBodySchema = z.object({
  planName: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  allowedPlatforms: z.array(z.enum(PlatformValues)).default([]),
  features: featuresSchema.optional(),
  monthlyPrice: z.number().nonnegative(),
  currency: z.string().max(8).optional().default("INR"),
  billingCycle: z.enum(AgencyPlanBillingCycleValues).optional().default("MONTHLY"),
  limits: limitsSchema.optional(),
  isActive: z.boolean().optional().default(true),
});

function defaultFeatures(): AgencyPlanAttrs["features"] {
  return {
    postScheduling: false,
    adTracking: false,
    aiCredits: 0,
    reviewManagement: false,
    leadCapture: false,
    whatsappAlerts: false,
    whatsappScheduling: false,
    unifiedInbox: false,
    advancedReports: false,
    bulkScheduling: false,
  };
}

function defaultLimits(): AgencyPlanAttrs["limits"] {
  return {
    socialAccounts: 5,
    campaigns: 10,
    teamMembers: 2,
    scheduledPostsPerMonth: 100,
  };
}

/** Merge DB doc with defaults so lean() / legacy docs never omit nested fields (avoids client crashes). */
function normalizePlanForResponse(
  p: {
    _id: string;
    planName?: string;
    description?: string;
    allowedPlatforms?: unknown;
    features?: Partial<AgencyPlanAttrs["features"]> | null;
    monthlyPrice?: number;
    currency?: string;
    billingCycle?: string;
    limits?: Partial<AgencyPlanAttrs["limits"]> | null;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  },
  clientsOnPlan: number,
) {
  const features = { ...defaultFeatures(), ...(p.features && typeof p.features === "object" ? p.features : {}) };
  const limits = { ...defaultLimits(), ...(p.limits && typeof p.limits === "object" ? p.limits : {}) };
  const platformSet = new Set<string>(PlatformValues);
  const allowed = Array.isArray(p.allowedPlatforms)
    ? (p.allowedPlatforms.filter((x): x is Platform => typeof x === "string" && platformSet.has(x)) as Platform[])
    : [];
  const price =
    typeof p.monthlyPrice === "number" && !Number.isNaN(p.monthlyPrice) ? p.monthlyPrice : 0;
  const cycle = (AgencyPlanBillingCycleValues as readonly string[]).includes(String(p.billingCycle))
    ? (p.billingCycle as AgencyPlanBillingCycle)
    : "MONTHLY";

  return {
    id: p._id,
    planName: typeof p.planName === "string" ? p.planName : "",
    description: typeof p.description === "string" ? p.description : "",
    allowedPlatforms: allowed,
    features,
    monthlyPrice: price,
    currency: typeof p.currency === "string" && p.currency.trim() ? p.currency : "INR",
    billingCycle: cycle,
    limits,
    isActive: p.isActive !== false,
    createdAt: p.createdAt ?? new Date(0),
    updatedAt: p.updatedAt ?? new Date(0),
    clientsOnPlan,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  let plans;
  try {
    plans = await AgencyPlan.find({ agencyOrgId: auth.organizationId })
      .sort({ createdAt: -1 })
      .lean();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError("Could not load plans", 500, msg);
  }

  const clientCounts = await Promise.all(
    plans.map((p) =>
      Organization.countDocuments({
        parentAgencyId: auth.organizationId,
        assignedPlanId: p._id,
      }),
    ),
  );

  return jsonOk({
    plans: plans.map((p, i) => normalizePlanForResponse(p, clientCounts[i] ?? 0)),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;
  if (!requireRole(auth.role, "OWNER")) {
    return jsonError("Only owners can create agency plans", 403);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = planBodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const d = parsed.data;
  const features: AgencyPlanAttrs["features"] = {
    ...defaultFeatures(),
    ...(d.features ?? {}),
  };
  const limits = d.limits ?? {
    socialAccounts: 5,
    campaigns: 10,
    teamMembers: 2,
    scheduledPostsPerMonth: 100,
  };

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  let doc;
  try {
    doc = await AgencyPlan.create({
      agencyOrgId: auth.organizationId,
      planName: d.planName.trim(),
      description: d.description.trim(),
      allowedPlatforms: d.allowedPlatforms,
      features,
      monthlyPrice: d.monthlyPrice,
      currency: d.currency.trim() || "INR",
      billingCycle: d.billingCycle,
      limits,
      isActive: d.isActive,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError("Could not create plan", 500, msg);
  }

  return jsonOk({
    id: doc._id,
    planName: doc.planName,
    description: doc.description,
    allowedPlatforms: doc.allowedPlatforms,
    features: doc.features,
    monthlyPrice: doc.monthlyPrice,
    currency: doc.currency,
    billingCycle: doc.billingCycle,
    limits: doc.limits,
    isActive: doc.isActive,
  });
}
