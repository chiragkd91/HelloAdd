import { NextRequest } from "next/server";
import { computeAndSaveHealthScore } from "@/lib/ai/agencyHealth";
import { jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "ADMIN");
  if (!auth.ok) return auth.response;

  const result = await computeAndSaveHealthScore(auth.organizationId);
  return jsonOk(result);
}
