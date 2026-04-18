import { AIUsageLog, Organization, connectMongo } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonDbUnavailable, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

function monthStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function rateLimitForPlan(plan: string | undefined): number {
  const trial = Number(process.env.AI_RATE_LIMIT_TRIAL ?? 20);
  const starter = Number(process.env.AI_RATE_LIMIT_STARTER ?? 50);
  const growth = Number(process.env.AI_RATE_LIMIT_GROWTH ?? 200);
  const agency = Number(process.env.AI_RATE_LIMIT_AGENCY ?? 1000);
  const limits: Record<string, number> = {
    STARTER: starter,
    GROWTH: growth,
    AGENCY: agency,
    TRIAL: trial,
  };
  return limits[plan ?? ""] ?? trial;
}

/** OWNER-only: monthly AI usage + estimated cost for the workspace. */
export async function GET(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "OWNER");
  if (!auth.ok) return auth.response;

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const org = await Organization.findById(auth.organizationId)
    .select(["plan", "name", "parentAgencyId", "planFeatures"])
    .lean();
  const limit = rateLimitForPlan(org?.plan);

  let agencyMonthlyCredits: number | null = null;
  if (org?.parentAgencyId && org.planFeatures && typeof org.planFeatures.aiCredits === "number") {
    const c = org.planFeatures.aiCredits;
    if (c < 0) agencyMonthlyCredits = null;
    else agencyMonthlyCredits = c;
  }

  const since = monthStart();
  const logs = await AIUsageLog.find({
    organizationId: auth.organizationId,
    createdAt: { $gte: since },
  }).lean();

  let totalCalls = 0;
  let totalTokens = 0;
  let estimatedCostUSD = 0;
  const byFeature: Record<string, { calls: number; tokens: number; costUSD: number }> = {};

  for (const row of logs) {
    totalCalls += 1;
    totalTokens += row.totalTokens;
    estimatedCostUSD += row.estimatedCostUSD;
    const f = row.feature;
    if (!byFeature[f]) byFeature[f] = { calls: 0, tokens: 0, costUSD: 0 };
    byFeature[f].calls += 1;
    byFeature[f].tokens += row.totalTokens;
    byFeature[f].costUSD += row.estimatedCostUSD;
  }

  return jsonOk({
    organizationName: org?.name ?? "",
    plan: org?.plan ?? "STARTER",
    monthStartsAt: since.toISOString(),
    hourlyRateLimit: limit,
    /** Monthly AI call cap from agency plan (managed clients only); null = not set or unlimited. */
    agencyMonthlyCredits,
    totalCallsThisMonth: totalCalls,
    totalTokensThisMonth: totalTokens,
    estimatedCostUSDThisMonth: estimatedCostUSD,
    byFeature,
  });
}
