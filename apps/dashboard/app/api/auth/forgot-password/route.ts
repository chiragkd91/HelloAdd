import { connectMongo, User } from "@helloadd/database";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyMarketingCors } from "@/lib/api/cors";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";

const bodySchema = z.object({
  email: z.string().email(),
});

/**
 * Request password reset (marketing site + dashboard).
 * Returns a generic success message; does not reveal whether the email exists.
 * Wire Resend (or similar) later to send real reset links when `RESEND_API_KEY` is set.
 */
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

  await User.findOne({ email: emailNorm }).lean();

  return cors(
    jsonOk({
      ok: true,
      message:
        "If an account exists for this email, you will receive password reset instructions when outbound email is configured.",
    })
  );
}
