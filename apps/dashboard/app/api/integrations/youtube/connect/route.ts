import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { assertAgencyOAuthGates } from "@/lib/agency/agencyPlanEnforcement";
import { parseOAuthNextParam } from "@/lib/api/oauth-redirect";
import { encodeState } from "@/lib/api/oauth-stub";
import { requireUserOrgRole } from "@/lib/auth/rbac";

const ADWORDS_SCOPE = "https://www.googleapis.com/auth/adwords";
const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const YOUTUBE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload";

/**
 * YouTube OAuth start. Uses Google OAuth provider and the same callback handler.
 * Integration is persisted as GOOGLE because Google + YouTube share auth in this stack.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  const gate = await assertAgencyOAuthGates(auth.organizationId, "YOUTUBE", "google");
  if (gate) {
    const u = new URL("/integrations", req.nextUrl.origin);
    u.searchParams.set("error", gate);
    return NextResponse.redirect(u);
  }

  const csrf = randomUUID();
  const next = parseOAuthNextParam(req.nextUrl.searchParams.get("next"));
  const state = encodeState({
    organizationId: auth.organizationId,
    platform: "YOUTUBE",
    provider: "google",
    csrf,
    next,
  });

  const origin = req.nextUrl.origin;
  const redirectUri = new URL("/api/integrations/google/callback", origin).toString();
  const clientId = process.env.GOOGLE_CLIENT_ID;

  let response: NextResponse;
  if (clientId) {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", [ADWORDS_SCOPE, YOUTUBE_SCOPE, YOUTUBE_UPLOAD_SCOPE].join(" "));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    response = NextResponse.redirect(url);
  } else {
    const callback = new URL("/api/integrations/google/callback", origin);
    callback.searchParams.set("code", "demo_oauth_code");
    callback.searchParams.set("state", state);
    response = NextResponse.redirect(callback);
  }

  response.cookies.set("oauth_csrf", csrf, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
