import {
  AgencyClientRelation,
  Organization,
  connectMongo,
} from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";
import { requireRole, requireUserOrgRole } from "@/lib/auth/rbac";
import { deleteOrganizationCascade } from "@/lib/organization/deleteOrganization";

const clientPortalBrandingSchema = z
  .object({
    logoUrl: z.union([z.string(), z.literal(""), z.null()]).optional(),
    primaryColor: z.union([z.string(), z.literal(""), z.null()]).optional(),
    colorScheme: z.enum(["LIGHT", "DARK", "CUSTOM"]).optional(),
    backgroundColor: z.union([z.string(), z.literal(""), z.null()]).optional(),
    textColor: z.union([z.string(), z.literal(""), z.null()]).optional(),
    displayName: z.union([z.string(), z.literal(""), z.null()]).optional(),
    showOverview: z.boolean().optional(),
    showCampaigns: z.boolean().optional(),
    showReports: z.boolean().optional(),
  })
  .optional();

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  onboardingComplete: z.boolean().optional(),
  isAgency: z.boolean().optional(),
  settings: z
    .object({
      weeklyReportEnabled: z.boolean().optional(),
      monthlyReportEnabled: z.boolean().optional(),
      timezone: z.union([z.string(), z.literal(""), z.null()]).optional(),
      currency: z.union([z.string(), z.literal(""), z.null()]).optional(),
      reportEmail: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
      alertEmail: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
      whatsappNumber: z.union([z.string(), z.literal(""), z.null()]).optional(),
      clientPortalBranding: clientPortalBrandingSchema,
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  const org = await Organization.findById(auth.organizationId).lean();
  if (!org) {
    return jsonError("Organization not found", 404);
  }

  return jsonOk({
    id: org._id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    onboardingComplete: org.onboardingComplete !== false,
    trialEndsAt: org.trialEndsAt ? org.trialEndsAt.toISOString() : null,
    razorpaySubscriptionId: org.razorpaySubscriptionId ?? null,
    nextBillingDate: org.nextBillingDate ? org.nextBillingDate.toISOString() : null,
    billingInvoices: (org.billingInvoices ?? []).map((inv) => ({
      billedAt: inv.billedAt.toISOString(),
      amountInr: inv.amountInr,
      plan: inv.plan,
      status: inv.status,
    })),
    isAgency: Boolean(org.isAgency),
    aiHealthScore: org.aiHealthScore ?? null,
    aiHealthLabel: org.aiHealthLabel ?? null,
    settings: org.settings ?? {
      weeklyReportEnabled: true,
      monthlyReportEnabled: true,
      timezone: "Asia/Kolkata",
      currency: "INR",
      reportEmail: null,
      alertEmail: null,
      whatsappNumber: null,
      clientPortalBranding: null,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

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

  const $set: Record<string, unknown> = {};
  if (parsed.data.onboardingComplete !== undefined) {
    $set.onboardingComplete = parsed.data.onboardingComplete;
  }
  if (parsed.data.name !== undefined) {
    $set.name = parsed.data.name.trim();
  }
  if (parsed.data.isAgency !== undefined) {
    if (!requireRole(auth.role, "ADMIN")) {
      return jsonError("Only owners and admins can change agency mode", 403);
    }
    $set.isAgency = parsed.data.isAgency;
  }
  if (parsed.data.settings) {
    const { clientPortalBranding, ...restSettings } = parsed.data.settings;
    for (const [k, v] of Object.entries(restSettings)) {
      if (v === undefined) continue;
      if (
        k === "reportEmail" ||
        k === "alertEmail" ||
        k === "whatsappNumber" ||
        k === "timezone" ||
        k === "currency"
      ) {
        $set[`settings.${k}`] = v === "" ? null : v;
      } else {
        $set[`settings.${k}`] = v;
      }
    }
    if (clientPortalBranding) {
      for (const [bk, bv] of Object.entries(clientPortalBranding)) {
        if (bv === undefined) continue;
        if (
          bk === "logoUrl" ||
          bk === "primaryColor" ||
          bk === "displayName" ||
          bk === "backgroundColor" ||
          bk === "textColor"
        ) {
          $set[`settings.clientPortalBranding.${bk}`] = bv === "" ? null : bv;
        } else {
          $set[`settings.clientPortalBranding.${bk}`] = bv;
        }
      }
    }
  }

  if (Object.keys($set).length === 0) {
    return jsonError("No updates", 400);
  }

  const org = await Organization.findOneAndUpdate(
    { _id: auth.organizationId },
    { $set },
    { new: true }
  ).lean();

  if (!org) {
    return jsonError("Organization not found", 404);
  }

  return jsonOk({
    id: org._id,
    onboardingComplete: org.onboardingComplete !== false,
    isAgency: Boolean(org.isAgency),
    settings: org.settings ?? {},
  });
}

const deleteOrgSchema = z
  .object({
    /** Must match the current workspace name exactly (after trim). */
    organizationName: z.string().min(1),
  })
  .strict();

/**
 * Irreversibly delete the workspace and related data. **OWNER only.**
 * Requires JSON body `{ "organizationName": "<exact name>" }`.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "OWNER");
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Send JSON: { \"organizationName\": \"…\" }", 400);
  }

  const parsed = deleteOrgSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const org = await Organization.findById(auth.organizationId).lean();
  if (!org) {
    return jsonError("Organization not found", 404);
  }

  if (parsed.data.organizationName.trim() !== org.name.trim()) {
    return jsonError("Organization name does not match", 400);
  }

  if (org.razorpaySubscriptionId) {
    return jsonError("Cancel your subscription in Billing before deleting this workspace", 409);
  }

  const [agencyClientLinks, childOrgs] = await Promise.all([
    AgencyClientRelation.countDocuments({ agencyOrgId: auth.organizationId }),
    Organization.countDocuments({ parentAgencyId: auth.organizationId }),
  ]);
  if (agencyClientLinks > 0 || childOrgs > 0) {
    return jsonError(
      "Remove or unlink all agency clients before deleting this workspace",
      409,
    );
  }

  if (org.parentAgencyId) {
    return jsonError(
      "This workspace is linked to an agency. Unlink it from the agency client list first",
      409,
    );
  }

  try {
    await deleteOrganizationCascade(auth.organizationId);
  } catch (e) {
    console.error("[organization DELETE]", e);
    return jsonError("Could not delete workspace", 500);
  }

  return jsonOk({ ok: true, deletedOrganizationId: auth.organizationId });
}
