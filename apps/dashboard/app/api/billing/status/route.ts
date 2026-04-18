import { Organization } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";

export async function GET(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  const org = await Organization.findById(auth.organizationId).lean();
  if (!org) {
    return jsonError("Organization not found", 404);
  }

  return jsonOk({
    plan: org.plan,
    trialEndsAt: org.trialEndsAt ? org.trialEndsAt.toISOString() : null,
    subscriptionId: org.razorpaySubscriptionId ?? null,
    nextBillingDate: org.nextBillingDate ? org.nextBillingDate.toISOString() : null,
    billingInvoices: (org.billingInvoices ?? []).map((inv) => ({
      billedAt: inv.billedAt.toISOString(),
      amountInr: inv.amountInr,
      plan: inv.plan,
      status: inv.status,
    })),
  });
}
