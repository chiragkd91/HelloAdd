import { NextRequest } from "next/server";
import { getBudgetSuggestions } from "@/lib/ai/budgetOptimizer";
import { jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  const suggestions = await getBudgetSuggestions(auth.organizationId);

  return jsonOk({
    ok: true,
    suggestions,
  });
}
