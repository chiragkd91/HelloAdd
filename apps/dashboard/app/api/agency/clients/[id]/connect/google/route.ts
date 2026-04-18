import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { assertAgencyOAuthGates } from "@/lib/agency/agencyPlanEnforcement";
import { parseOAuthNextParam } from "@/lib/api/oauth-redirect";
import { encodeState } from "@/lib/api/oauth-stub";
import { loadAgencyClient } from "@/lib/api/agencyClientAccess";
import { requireAgencyManager } from "@/lib/api/agencyGuard";

const ADWORDS_SCOPE = "https://www.googleapis.com/auth/adwords";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;

  const clientOrgId = ctx.params.id;
  if (!clientOrgId) {
    return NextResponse.json({ error: "Missing client id" }, { status: 400 });
  }

  const bundle = await loadAgencyClient(auth.organizationId, clientOrgId);
  if (!bundle) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const gate = await assertAgencyOAuthGates(clientOrgId, "GOOGLE", "google");
  if (gate) {
    const u = new URL(`/agency/clients/${clientOrgId}/integrations`, req.nextUrl.origin);
    u.searchParams.set("error", gate);
    return NextResponse.redirect(u);
  }

  const csrf = randomUUID();
  const next = parseOAuthNextParam(`/agency/clients/${clientOrgId}/integrations`);
  const state = encodeState({
    organizationId: clientOrgId,
    platform: "GOOGLE",
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
    url.searchParams.set("scope", ADWORDS_SCOPE);
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
