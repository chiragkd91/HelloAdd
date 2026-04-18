import crypto from "crypto";
import Razorpay from "razorpay";

function getClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id?.trim() || !key_secret?.trim()) {
    throw new Error("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
  }
  return new Razorpay({ key_id, key_secret });
}

export async function createSubscription(planId: string, notes: Record<string, string>) {
  const rzp = getClient();
  return rzp.subscriptions.create({
    plan_id: planId,
    total_count: 12,
    quantity: 1,
    notes,
  });
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

export function planIdForProduct(plan: "STARTER" | "GROWTH" | "AGENCY"): string {
  const key =
    plan === "STARTER"
      ? "RAZORPAY_PLAN_STARTER"
      : plan === "GROWTH"
        ? "RAZORPAY_PLAN_GROWTH"
        : "RAZORPAY_PLAN_AGENCY";
  const id = process.env[key]?.trim();
  if (!id) {
    throw new Error(`${key} is not set`);
  }
  return id;
}
