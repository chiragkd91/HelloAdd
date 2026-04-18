import { NextRequest } from "next/server";
import { z } from "zod";
import { analyzeCampaign } from "@/lib/ai/campaignAnalyzer";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

const bodySchema = z.object({
  campaignId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  try {
    const analysis = await analyzeCampaign(parsed.data.campaignId, auth.organizationId);
    return jsonOk({ analysis });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    if (msg.includes("not found")) {
      return jsonError("Campaign not found", 404);
    }
    return jsonError(msg, 500);
  }
}
