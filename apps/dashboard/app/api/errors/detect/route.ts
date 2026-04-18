import { NextRequest } from "next/server";
import { detectErrors } from "@/lib/errors/errorDetector";
import { jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

/** Manual run of automated campaign / budget checks (same engine as post-sync). */
export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  const detected = await detectErrors(auth.organizationId);

  return jsonOk({
    ok: true,
    count: detected.length,
    detected: detected.map((d) => ({
      type: d.type,
      severity: d.severity,
      campaignId: d.campaignId ?? null,
      campaignName: d.campaignName ?? null,
      platform: d.platform ?? null,
      message: d.message,
      suggestedFix: d.suggestedFix,
    })),
  });
}
