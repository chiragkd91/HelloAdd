import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { assertAgencyOAuthGates } from "@/lib/agency/agencyPlanEnforcement";
import { parseOAuthNextParam } from "@/lib/api/oauth-redirect";
import { encodeState } from "@/lib/api/oauth-stub";
import { loadAgencyClient } from "@/lib/api/agencyClientAccess";
import { requireAgencyManager } from "@/lib/api/agencyGuard";

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

  const gate = await assertAgencyOAuthGates(clientOrgId, "FACEBOOK", "meta");
  if (gate) {
    const u = new URL(`/agency/clients/${clientOrgId}/integrations`, req.nextUrl.origin);
    u.searchParams.set("error", gate);
    return NextResponse.redirect(u);
  }

  const csrf = randomUUID();
  const next = parseOAuthNextParam(`/agency/clients/${clientOrgId}/integrations`);
  const state = encodeState({
    organizationId: clientOrgId,
    platform: "FACEBOOK",
    provider: "meta",
    csrf,
    next,
  });

  const appId = process.env.META_APP_ID;
  const origin = req.nextUrl.origin;
  const redirectUri = new URL("/api/integrations/meta/callback", origin).toString();

  let response: NextResponse;
  if (appId) {
    const dialog = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    dialog.searchParams.set("client_id", appId);
    dialog.searchParams.set("redirect_uri", redirectUri);
    dialog.searchParams.set(
      "scope",
      "ads_read,ads_management,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,business_management"
    );
    dialog.searchParams.set("state", state);
    dialog.searchParams.set("response_type", "code");
    response = NextResponse.redirect(dialog);
  } else {
    const callback = new URL("/api/integrations/meta/callback", origin);
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
