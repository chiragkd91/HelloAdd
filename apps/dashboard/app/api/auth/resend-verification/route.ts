import { randomBytes } from "crypto";
import { connectMongo, User } from "@helloadd/database";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyMarketingCors } from "@/lib/api/cors";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { dashboardPublicBaseUrl } from "@/lib/auth/dashboardBaseUrl";
import { sendVerificationEmail } from "@/lib/email/sendVerificationEmail";
import { hashInviteToken } from "@/lib/organization/inviteToken";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function OPTIONS(req: NextRequest) {
  return applyMarketingCors(req, new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const cors = (res: NextResponse) => applyMarketingCors(req, res);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return cors(jsonError("Invalid JSON body", 400));
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return cors(jsonError("Validation failed", 400, parsed.error.flatten()));
  }

  const emailNorm = parsed.data.email.toLowerCase().trim();

  try {
    await connectMongo();
  } catch (e) {
    return cors(jsonDbUnavailable(e));
  }

  const user = await User.findOne({ email: emailNorm });
  /** Same response whether or not the user exists — avoid email enumeration. */
  if (!user || user.emailVerified !== false || user.authProvider !== "email") {
    return cors(jsonOk({ ok: true }));
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(rawToken);
  const emailVerificationExpires = new Date();
  emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 48);

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpires,
      },
    },
  );

  const base = dashboardPublicBaseUrl();
  const verifyUrl = `${base}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
  const sent = await sendVerificationEmail(emailNorm, verifyUrl);

  if (process.env.NODE_ENV === "development" && !sent) {
    console.info("[Hello Add] Resend verification link (email not sent — RESEND_API_KEY missing):", verifyUrl);
  }

  if (!sent && process.env.NODE_ENV === "production") {
    return cors(jsonError("Could not send email. Try again later or contact support.", 503));
  }

  return cors(jsonOk({ ok: true }));
}
