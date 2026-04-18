import { Organization } from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { createSubscription, planIdForProduct } from "@/lib/billing/razorpay";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

const bodySchema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "AGENCY"]),
});

export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "OWNER");
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

  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  if (!key) {
    return jsonError("Billing is not configured (NEXT_PUBLIC_RAZORPAY_KEY_ID)", 503);
  }

  try {
    const planId = planIdForProduct(parsed.data.plan);
    const sub = await createSubscription(planId, {
      organizationId: auth.organizationId,
      plan: parsed.data.plan,
    });

    await Organization.findByIdAndUpdate(auth.organizationId, {
      $set: { razorpaySubscriptionId: sub.id },
    });

    return jsonOk({
      subscriptionId: sub.id,
      key,
    });
  } catch (e) {
    console.error("[billing/create-subscription]", e);
    return jsonError(e instanceof Error ? e.message : "Could not create subscription", 500);
  }
}
