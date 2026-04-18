import {
  AgencyPlan,
  Campaign,
  Integration,
  Organization,
  OrganizationInvite,
  OrganizationMember,
  connectMongo,
  type Platform,
} from "@helloadd/database";
import type { AgencyPlanLimitsAttrs } from "@helloadd/database/agency-plan-types";
import type { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/http";

function effectiveCap(n: number | undefined): number | null {
  if (n === undefined || n === null) return null;
  if (n < 0) return null;
  return n;
}

export async function loadAgencyPlanLimitsForOrg(
  organizationId: string,
): Promise<AgencyPlanLimitsAttrs | null> {
  await connectMongo();
  const org = await Organization.findById(organizationId)
    .select(["parentAgencyId", "assignedPlanId"])
    .lean();
  if (!org?.parentAgencyId || !org.assignedPlanId) return null;
  const plan = await AgencyPlan.findById(org.assignedPlanId).select(["limits"]).lean();
  return plan?.limits ?? null;
}

/** Block if any platform is not in the agency plan allowlist (managed clients only). */
export async function enforceAgencyAllowedPlatforms(
  organizationId: string,
  platforms: Platform[],
): Promise<NextResponse | null> {
  if (platforms.length === 0) return null;
  await connectMongo();
  const org = await Organization.findById(organizationId)
    .select(["parentAgencyId", "allowedPlatforms"])
    .lean();
  if (!org?.parentAgencyId) return null;
  const allowed = org.allowedPlatforms as Platform[] | undefined;
  if (!Array.isArray(allowed) || allowed.length === 0) return null;
  const set = new Set(allowed);
  for (const p of platforms) {
    if (!set.has(p)) {
      return jsonError(`Platform ${p} is not included in your agency plan`, 403);
    }
  }
  return null;
}

export async function enforceAgencyCampaignLimit(organizationId: string): Promise<NextResponse | null> {
  const limits = await loadAgencyPlanLimitsForOrg(organizationId);
  const cap = limits ? effectiveCap(limits.campaigns) : null;
  if (cap === null) return null;
  await connectMongo();
  const n = await Campaign.countDocuments({ organizationId });
  if (n >= cap) {
    return jsonError(`Campaign limit reached for your agency plan (${cap} max)`, 403);
  }
  return null;
}

export async function enforceAgencyTeamInviteLimit(organizationId: string): Promise<NextResponse | null> {
  const limits = await loadAgencyPlanLimitsForOrg(organizationId);
  const cap = limits ? effectiveCap(limits.teamMembers) : null;
  if (cap === null) return null;
  await connectMongo();
  const members = await OrganizationMember.countDocuments({ organizationId });
  const pending = await OrganizationInvite.countDocuments({
    organizationId,
    acceptedAt: null,
  });
  if (members + pending >= cap) {
    return jsonError(`Team member limit reached for your agency plan (${cap} max, including pending invites)`, 403);
  }
  return null;
}

/** Call before accepting an invite — ensures seat is still available. */
export async function enforceAgencyTeamMemberAcceptLimit(organizationId: string): Promise<NextResponse | null> {
  const limits = await loadAgencyPlanLimitsForOrg(organizationId);
  const cap = limits ? effectiveCap(limits.teamMembers) : null;
  if (cap === null) return null;
  await connectMongo();
  const members = await OrganizationMember.countDocuments({ organizationId });
  if (members >= cap) {
    return jsonError(`Team member limit reached for your agency plan (${cap} max)`, 403);
  }
  return null;
}

/**
 * OAuth start / callback: platform allowlist for managed clients.
 * Returns an error code for `?error=` redirects, or null if allowed.
 */
export async function assertAgencyPlatformConnectAllowed(
  organizationId: string,
  kind: "meta" | "google" | "linkedin" | "whatsapp",
): Promise<string | null> {
  await connectMongo();
  const org = await Organization.findById(organizationId).select(["parentAgencyId", "allowedPlatforms"]).lean();
  if (!org?.parentAgencyId) return null;
  const allowed = org.allowedPlatforms as Platform[] | undefined;
  if (!allowed || allowed.length === 0) return null;
  const set = new Set(allowed);
  if (kind === "meta") {
    if (set.has("FACEBOOK") || set.has("INSTAGRAM")) return null;
    return "agency_plan_platform";
  }
  if (kind === "google") {
    if (set.has("GOOGLE") || set.has("YOUTUBE")) return null;
    return "agency_plan_platform";
  }
  if (kind === "linkedin") {
    if (set.has("LINKEDIN")) return null;
    return "agency_plan_platform";
  }
  if (kind === "whatsapp") {
    if (set.has("WHATSAPP")) return null;
    return "agency_plan_platform";
  }
  return null;
}

/**
 * Before creating a new integration row (new platform slot). Reconnecting the same platform skips the count check.
 */
export async function assertNewIntegrationWithinSocialLimit(
  organizationId: string,
  platform: Platform,
): Promise<string | null> {
  await connectMongo();
  const existing = await Integration.findOne({ organizationId, platform }).lean();
  if (existing) return null;
  const limits = await loadAgencyPlanLimitsForOrg(organizationId);
  const cap = limits ? effectiveCap(limits.socialAccounts) : null;
  if (cap === null) return null;
  const n = await Integration.countDocuments({ organizationId });
  if (n >= cap) return "agency_plan_social_limit";
  return null;
}

export async function assertAgencyOAuthGates(
  organizationId: string,
  integrationPlatform: Platform,
  oauthKind: "meta" | "google" | "linkedin",
): Promise<string | null> {
  const p = await assertAgencyPlatformConnectAllowed(organizationId, oauthKind);
  if (p) return p;
  return assertNewIntegrationWithinSocialLimit(organizationId, integrationPlatform);
}

/** WhatsApp Cloud connect (JSON APIs) — platform + social-account cap. */
export async function enforceAgencyWhatsAppConnect(organizationId: string): Promise<NextResponse | null> {
  const p = await assertAgencyPlatformConnectAllowed(organizationId, "whatsapp");
  if (p) {
    return jsonError("WhatsApp is not included in your agency plan", 403);
  }
  const s = await assertNewIntegrationWithinSocialLimit(organizationId, "WHATSAPP");
  if (s) {
    return jsonError("Social account limit reached for your agency plan", 403);
  }
  return null;
}
