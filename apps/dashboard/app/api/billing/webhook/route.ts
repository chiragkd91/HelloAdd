import { Organization, connectMongo, type Plan } from "@helloadd/database";
import { NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/billing/razorpay";
import { jsonError, jsonOk } from "@/lib/api/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return jsonError("Missing signature", 400);
  }

  const raw = await req.text();
  if (!verifyWebhookSignature(raw, signature)) {
    return jsonError("Invalid signature", 400);
  }

  let event: {
    event?: string;
    payload?: {
      subscription?: { entity?: RazorpaySubscriptionEntity };
      payment?: { entity?: { id?: string; amount?: number; status?: string } };
    };
  };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  try {
    await connectMongo();
  } catch (e) {
    console.error("[billing/webhook] db", e);
    return jsonError("Database unavailable", 503);
  }

  const subEntity = event.payload?.subscription?.entity;
  if (subEntity?.notes?.organizationId) {
    const orgId = String(subEntity.notes.organizationId);
    const pr = String(subEntity.notes.plan ?? "STARTER");
    const plan = (["STARTER", "GROWTH", "AGENCY"].includes(pr) ? pr : "STARTER") as Plan;

    if (
      event.event === "subscription.activated" ||
      event.event === "subscription.charged" ||
      event.event === "subscription.completed"
    ) {
      await Organization.findByIdAndUpdate(orgId, {
        $set: {
          plan,
          razorpaySubscriptionId: subEntity.id,
          trialEndsAt: null,
        },
      });
    }
  }

  return jsonOk({ received: true });
}

type RazorpaySubscriptionEntity = {
  id: string;
  notes?: { organizationId?: string; plan?: string };
};
