import {
  AgencyPlan,
  Organization,
  ScheduledPost,
  connectMongo,
  type Platform,
} from "@helloadd/database";
import type { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/http";

function utcMonthStart(): { start: Date; nextMonthStart: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, nextMonthStart };
}

/**
 * For orgs managed by an agency (`parentAgencyId`): enforce plan snapshot
 * (post scheduling flag, allowed platforms, monthly scheduled-post cap).
 * Non–agency-client orgs: no-op (returns null).
 */
export async function enforceAgencyScheduledPostRules(
  organizationId: string,
  platforms: Platform[],
  options: { countNewPostTowardMonthlyLimit: boolean },
): Promise<NextResponse | null> {
  await connectMongo();
  const org = await Organization.findById(organizationId)
    .select(["parentAgencyId", "assignedPlanId", "allowedPlatforms", "planFeatures"])
    .lean();
  if (!org?.parentAgencyId) return null;

  const pf = org.planFeatures;
  if (pf && pf.postScheduling === false) {
    return jsonError("Post scheduling is not enabled for your agency plan", 403);
  }

  const allowed = org.allowedPlatforms;
  if (Array.isArray(allowed) && allowed.length > 0) {
    const set = new Set(allowed);
    for (const p of platforms) {
      if (!set.has(p)) {
        return jsonError(`Platform ${p} is not included in your agency plan`, 403);
      }
    }
  }

  if (!options.countNewPostTowardMonthlyLimit) return null;

  let cap: number | null = null;
  if (org.assignedPlanId) {
    const plan = await AgencyPlan.findById(org.assignedPlanId).select(["limits"]).lean();
    const n = plan?.limits?.scheduledPostsPerMonth;
    if (typeof n === "number") {
      if (n < 0) cap = null;
      else cap = n;
    }
  }
  if (cap === null) return null;

  const { start, nextMonthStart } = utcMonthStart();
  const used = await ScheduledPost.countDocuments({
    organizationId,
    createdAt: { $gte: start, $lt: nextMonthStart },
  });
  if (used >= cap) {
    return jsonError(
      `Monthly scheduled post limit reached (${cap} per month for your plan)`,
      403,
    );
  }
  return null;
}
