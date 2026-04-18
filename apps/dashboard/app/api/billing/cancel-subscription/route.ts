import { Organization } from "@helloadd/database";
import Razorpay from "razorpay";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "OWNER");
  if (!auth.ok) return auth.response;

  const org = await Organization.findById(auth.organizationId).lean();
  if (!org?.razorpaySubscriptionId) {
    return jsonError("No active subscription", 400);
  }

  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!key_id || !key_secret) {
    return jsonError("Billing is not configured", 503);
  }

  try {
    const rzp = new Razorpay({ key_id, key_secret });
    await rzp.subscriptions.cancel(org.razorpaySubscriptionId);
  } catch (e) {
    console.error("[billing/cancel-subscription]", e);
    return jsonError("Could not cancel subscription", 500);
  }

  await Organization.findByIdAndUpdate(auth.organizationId, {
    $set: { razorpaySubscriptionId: null },
  });

  return jsonOk({ ok: true });
}
