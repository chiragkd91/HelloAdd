import { createId } from "@paralleldrive/cuid2";
import { connectMongo, Organization, OrganizationMember, Session, User } from "@helloadd/database";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionExpiresAt } from "@/lib/api/session";

type GoogleLoginState = {
  csrf: string;
  from?: string;
};

function decodeLoginState(raw: string | null): GoogleLoginState | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as GoogleLoginState;
    if (!j.csrf) return null;
    return j;
  } catch {
    return null;
  }
}

function slugifyBase(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/**
 * Handles the Google OAuth callback for login/registration.
 * - Existing Google account → logs in.
 * - New account → creates User + Organization + OrganizationMember, then logs in.
 * - Email already registered with password → blocks to prevent account takeover.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const loginUrl = new URL("/login", origin);

  // Defined first so every return path clears the CSRF cookie
  function redirect(url: URL | string): NextResponse {
    const res = NextResponse.redirect(url);
    res.cookies.delete("google_login_csrf");
    return res;
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const state = decodeLoginState(searchParams.get("state"));

  if (oauthError) {
    loginUrl.searchParams.set("error", "google_denied");
    return redirect(loginUrl);
  }

  if (!code || !state) {
    loginUrl.searchParams.set("error", "google_invalid");
    return redirect(loginUrl);
  }

  // CSRF verification
  const csrfCookie = req.cookies.get("google_login_csrf")?.value;
  if (!csrfCookie || csrfCookie !== state.csrf) {
    loginUrl.searchParams.set("error", "google_invalid");
    return redirect(loginUrl);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    loginUrl.searchParams.set("error", "google_not_configured");
    return redirect(loginUrl);
  }

  // Exchange code for access token, then fetch profile
  let googleEmail: string;
  let googleName: string;
  let googleAvatar: string | null;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: new URL("/api/auth/google/callback", origin).toString(),
        grant_type: "authorization_code",
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) throw new Error("No access token returned");

    const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const info = (await infoRes.json()) as {
      email?: string;
      name?: string;
      picture?: string;
    };
    if (!info.email) throw new Error("No email in Google profile");

    googleEmail = info.email.toLowerCase().trim();
    googleName = info.name ?? info.email.split("@")[0];
    googleAvatar = info.picture ?? null;
  } catch {
    loginUrl.searchParams.set("error", "google_failed");
    return redirect(loginUrl);
  }

  try {
    await connectMongo();
  } catch {
    loginUrl.searchParams.set("error", "google_failed");
    return redirect(loginUrl);
  }

  // Find or create the user
  let userId: string;
  const existing = await User.findOne({ email: googleEmail }).lean();

  if (existing) {
    if (existing.authProvider !== "google") {
      // Email already registered via password — block to prevent account takeover
      loginUrl.searchParams.set("error", "google_email_taken");
      return redirect(loginUrl);
    }
    userId = existing._id;
    // Refresh avatar if it changed
    if (googleAvatar && existing.avatarUrl !== googleAvatar) {
      await User.updateOne({ _id: userId }, { $set: { avatarUrl: googleAvatar } });
    }
  } else {
    // First-time Google sign-up — create user + workspace
    const newUser = await User.create({
      name: googleName,
      email: googleEmail,
      password: null,
      authProvider: "google",
      avatarUrl: googleAvatar,
      emailVerified: true,
    });
    userId = newUser._id;

    const base = slugifyBase(googleName);
    const slug = `${base || "org"}-${createId().slice(0, 8)}`;
    const org = await Organization.create({
      name: `${googleName}'s workspace`,
      slug,
      plan: "STARTER",
    });

    await OrganizationMember.create({
      userId,
      organizationId: org._id,
      role: "OWNER",
    });
  }

  // Create session
  const token = createSessionToken();
  await Session.create({
    userId,
    token,
    expiresAt: sessionExpiresAt(),
  });

  // Redirect to original destination (or root, handled by middleware)
  const destination = state.from && state.from.startsWith("/") ? state.from : "/";
  const response = redirect(new URL(destination, origin));
  response.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
