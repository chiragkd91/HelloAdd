import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

type GoogleLoginState = {
  csrf: string;
  from?: string;
};

function encodeLoginState(s: GoogleLoginState): string {
  return Buffer.from(JSON.stringify(s), "utf8").toString("base64url");
}

/**
 * Initiates Google OAuth login flow.
 * Preserves the `from` query param so the user lands back where they came from.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(url);
  }

  const from = req.nextUrl.searchParams.get("from") ?? undefined;
  const csrf = randomUUID();
  const state = encodeLoginState({ csrf, from });

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", new URL("/api/auth/google/callback", req.nextUrl.origin).toString());
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(googleUrl);
  response.cookies.set("google_login_csrf", csrf, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
