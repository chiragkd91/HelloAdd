import { connectMongo, Organization, OrganizationMember, Session, User } from "@helloadd/database";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionExpiresAt } from "@/lib/api/session";
import { hashInviteToken } from "@/lib/organization/inviteToken";

/**
 * GET /api/auth/verify-email?token=...
 * Validates the email verification token, marks the user verified, sets session cookie, redirects home.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const loginUrl = new URL("/login", origin);

  const raw = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (raw.length !== 64) {
    loginUrl.searchParams.set("error", "verify_invalid");
    return NextResponse.redirect(loginUrl);
  }

  const tokenHash = hashInviteToken(raw);

  try {
    await connectMongo();
  } catch {
    loginUrl.searchParams.set("error", "verify_failed");
    return NextResponse.redirect(loginUrl);
  }

  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    loginUrl.searchParams.set("error", "verify_expired");
    return NextResponse.redirect(loginUrl);
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationExpires: null,
      },
    },
  );

  const sessionToken = createSessionToken();
  await Session.create({
    userId: user._id,
    token: sessionToken,
    expiresAt: sessionExpiresAt(),
  });

  const home = new URL("/", origin);
  const res = NextResponse.redirect(home);
  res.cookies.set("session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
