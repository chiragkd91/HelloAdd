import { connectMongo, Session, User } from "@helloadd/database";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyMarketingCors } from "@/lib/api/cors";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { createSessionToken, publicUser, sessionExpiresAt } from "@/lib/api/session";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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

  const { email, password } = parsed.data;

  try {
    await connectMongo();
  } catch (e) {
    return cors(jsonDbUnavailable(e));
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return cors(jsonError("Invalid email or password", 401));
  }

  if (!user.password) {
    return cors(jsonError("This account uses Google sign-in. Please continue with Google.", 401));
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return cors(jsonError("Invalid email or password", 401));
  }

  if (user.emailVerified === false) {
    return cors(
      jsonError(
        "Please verify your email before signing in. Check your inbox for the link, or use “Resend” on the sign-up page.",
        403,
      ),
    );
  }

  const token = createSessionToken();
  await Session.create({
    userId: user._id,
    token,
    expiresAt: sessionExpiresAt(),
  });

  const res = jsonOk({
    user: publicUser(user),
    token,
  });

  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });

  return cors(res);
}
