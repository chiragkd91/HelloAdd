import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { assertAgencyOAuthGates } from "@/lib/agency/agencyPlanEnforcement";
import { parseOAuthNextParam } from "@/lib/api/oauth-redirect";
import { encodeState } from "@/lib/api/oauth-stub";
import { requireUserOrgRole } from "@/lib/auth/rbac";

const SCOPE =
  "r_ads,r_ads_reporting,r_organization_social,w_member_social,w_organization_social,r_liteprofile";

/**
 * LinkedIn Marketing OAuth. If `LINKEDIN_CLIENT_ID` is set, redirects to LinkedIn; otherwise stub.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  const gate = await assertAgencyOAuthGates(auth.organizationId, "LINKEDIN", "linkedin");
  if (gate) {
    const u = new URL("/integrations", req.nextUrl.origin);
    u.searchParams.set("error", gate);
    return NextResponse.redirect(u);
  }

  const csrf = randomUUID();
  const next = parseOAuthNextParam(req.nextUrl.searchParams.get("next"));
  const state = encodeState({
    organizationId: auth.organizationId,
    platform: "LINKEDIN",
    provider: "linkedin",
    csrf,
    next,
  });

  const origin = req.nextUrl.origin;
  const redirectUri = new URL("/api/integrations/linkedin/callback", origin).toString();
  const clientId = process.env.LINKEDIN_CLIENT_ID;

  let response: NextResponse;
  if (clientId) {
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SCOPE);
    url.searchParams.set("state", state);
    response = NextResponse.redirect(url);
  } else {
    const callback = new URL("/api/integrations/linkedin/callback", origin);
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
