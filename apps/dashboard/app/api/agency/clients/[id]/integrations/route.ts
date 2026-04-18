import {
  AgencyPlan,
  Integration,
  PlatformValues,
  connectMongo,
  type IntegrationAttrs,
  type Platform,
} from "@helloadd/database";
import { NextRequest } from "next/server";
import { loadAgencyClient } from "@/lib/api/agencyClientAccess";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonError, jsonOk } from "@/lib/api/http";

type Ctx = { params: { id: string } };

function sanitizeIntegration(i: Pick<
  IntegrationAttrs,
  "_id" | "platform" | "accountId" | "accountName" | "isActive" | "connectedAt" | "tokenExpiresAt" | "lastSyncedAt"
>) {
  return {
    id: i._id,
    platform: i.platform,
    accountId: i.accountId,
    accountName: i.accountName,
    isActive: i.isActive,
    connectedAt: i.connectedAt.toISOString(),
    tokenExpiresAt: i.tokenExpiresAt ? i.tokenExpiresAt.toISOString() : null,
    lastSyncedAt: i.lastSyncedAt ? i.lastSyncedAt.toISOString() : null,
  };
}

/** Primary integration row used to resolve Meta / Google pairs (FB+IG, Google+YouTube). */
function integrationForPlatform(rows: IntegrationAttrs[], platform: Platform): IntegrationAttrs | null {
  if (platform === "INSTAGRAM" || platform === "FACEBOOK") {
    return rows.find((x) => x.platform === "FACEBOOK") ?? null;
  }
  if (platform === "YOUTUBE" || platform === "GOOGLE") {
    return rows.find((x) => x.platform === "GOOGLE") ?? null;
  }
  return rows.find((x) => x.platform === platform) ?? null;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;

  const clientOrgId = ctx.params.id;
  if (!clientOrgId) return jsonError("Missing client id", 400);

  const bundle = await loadAgencyClient(auth.organizationId, clientOrgId);
  if (!bundle) return jsonError("Client not found", 404);

  await connectMongo();
  const org = bundle.organization;
  const allowed = (org.allowedPlatforms ?? []) as Platform[];
  const allPlatforms = [...PlatformValues] as Platform[];

  let planName: string | null = null;
  if (org.assignedPlanId) {
    const plan = await AgencyPlan.findById(org.assignedPlanId).select("planName").lean();
    planName = plan?.planName ?? null;
  }

  const raw = (await Integration.find({ organizationId: clientOrgId }).sort({ connectedAt: -1 }).lean()) as IntegrationAttrs[];
  const items = raw.map((i) => sanitizeIntegration(i));

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const tokenWarnings: Array<{ platform: Platform; integrationId: string; expiresAt: string; daysLeft: number }> = [];
  for (const i of raw) {
    const exp = i.tokenExpiresAt;
    if (!exp) continue;
    const t = exp.getTime();
    if (t > now && t - now < weekMs) {
      const daysLeft = Math.ceil((t - now) / (24 * 60 * 60 * 1000));
      tokenWarnings.push({
        platform: i.platform,
        integrationId: i._id,
        expiresAt: exp.toISOString(),
        daysLeft,
      });
    }
  }

  const cards = allPlatforms.map((platform) => {
    const inPlan = allowed.includes(platform);
    const doc = integrationForPlatform(raw, platform);
    const hint = bundle.relation.integrationHints?.find((h) => h.platform === platform);
    let status: "connected" | "pending" | "not_connected" | "unavailable" = "not_connected";
    if (!inPlan) status = "unavailable";
    else if (doc?.isActive) status = "connected";
    else if (hint?.state === "PENDING_MANUAL") status = "pending";

    const base = doc ? items.find((x) => x.id === doc._id) ?? null : null;

    return {
      platform,
      inPlan,
      status,
      integration: base,
      hint: hint
        ? {
            state: hint.state,
            manualAccountId: hint.manualAccountId ?? null,
            whatsappPhone: hint.whatsappPhone ?? null,
            bsp: hint.bsp ?? null,
          }
        : null,
    };
  });

  return jsonOk({
    clientOrgId,
    clientName: org.name,
    planName,
    assignedPlanId: org.assignedPlanId ?? null,
    allowedPlatforms: allowed,
    integrations: items,
    cards,
    tokenWarnings,
  });
}
