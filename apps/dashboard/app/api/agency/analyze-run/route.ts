import { NextRequest } from "next/server";
import { getBudgetSuggestions } from "@/lib/ai/budgetOptimizer";
import { detectErrors } from "@/lib/errors/errorDetector";
import { jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  const [suggestions, errors] = await Promise.all([
    getBudgetSuggestions(auth.organizationId),
    detectErrors(auth.organizationId),
  ]);

  return jsonOk({
    suggestions,
    errorsDetected: errors.length,
  });
}
