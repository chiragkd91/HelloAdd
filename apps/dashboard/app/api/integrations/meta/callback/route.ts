import { connectMongo, Integration } from "@helloadd/database";
import { NextRequest, NextResponse } from "next/server";
import {
  exchangeMetaOAuthCode,
  getMetaAdAccounts,
  getMetaInstagramBusinessId,
  getMetaPages,
  getMetaUserProfile,
  normalizeMetaAdAccountId,
} from "@/lib/api/meta";
import { assertAgencyOAuthGates } from "@/lib/agency/agencyPlanEnforcement";
import { jsonDbUnavailable, jsonError } from "@/lib/api/http";
import { isValidOAuthOrganizationId } from "@/lib/api/oauth-org-id";
import { oauthErrorUrl, oauthSuccessUrl } from "@/lib/api/oauth-redirect";
import { decodeState } from "@/lib/api/oauth-stub";
import { syncOrganization } from "@/lib/sync/syncEngine";

/** Meta OAuth callback — stub demo code or real token exchange when `META_APP_ID` / `META_APP_SECRET` are set. */
export async function GET(req: NextRequest) {
  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const { searchParams } = new URL(req.url);
  const oauthError = searchParams.get("error");
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const state = decodeState(stateRaw);

  if (!code || !state) {
    return jsonError("Missing code or invalid state", 400);
  }

  // CSRF verification — token must match the httpOnly cookie set at OAuth start
  const csrfCookie = req.cookies.get("oauth_csrf")?.value;
  if (!csrfCookie || csrfCookie !== state.csrf) {
    return jsonError("Invalid OAuth state", 400);
  }

  if (!isValidOAuthOrganizationId(state.organizationId)) {
    return jsonError("Invalid state", 400);
  }
  if (state.provider !== "meta" || state.platform !== "FACEBOOK") {
    return jsonError("Invalid OAuth state provider/platform", 400);
  }

  // Burn the CSRF cookie on every redirect response from this point on
  function redirect(url: URL | string): NextResponse {
    const res = NextResponse.redirect(url);
    res.cookies.delete("oauth_csrf");
    return res;
  }

  if (oauthError) {
    const errUrl = new URL("/integrations", req.nextUrl.origin);
    errUrl.searchParams.set("error", "facebook_denied");
    return redirect(errUrl);
  }

  const redirectUri = new URL("/api/integrations/meta/callback", req.nextUrl.origin).toString();
  const successUrl = oauthSuccessUrl(req, state, "facebook");

  const agencyGate = await assertAgencyOAuthGates(state.organizationId, "FACEBOOK", "meta");
  if (agencyGate) {
    return redirect(oauthErrorUrl(req, state, agencyGate));
  }

  if (code === "demo_oauth_code") {
    const doc = await Integration.findOneAndUpdate(
      { organizationId: state.organizationId, platform: state.platform },
      {
        $set: {
          organizationId: state.organizationId,
          platform: state.platform,
          accessToken: `oauth_stub_${code}`,
          refreshToken: null,
          tokenExpiresAt: null,
          accountId: `meta_${state.organizationId.slice(0, 8)}`,
          accountName: "Meta Business (stub)",
          metadata: {
            adAccountId: `meta_${state.organizationId.slice(0, 8)}`,
            pageId: `page_${state.organizationId.slice(0, 6)}`,
            igUserId: null,
            metaUserId: null,
          },
          isActive: true,
          connectedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    ).lean();

    if (!doc) {
      return jsonError("Failed to save integration", 500);
    }
    return redirect(successUrl);
  }

  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    return jsonError("Meta OAuth is not configured (META_APP_ID / META_APP_SECRET)", 500);
  }

  try {
    const { accessToken, tokenExpiresAt } = await exchangeMetaOAuthCode(code, redirectUri);
    const accounts = await getMetaAdAccounts(accessToken);
    const first = accounts[0];
    if (!first?.id) {
      const errUrl = new URL("/integrations", req.nextUrl.origin);
      errUrl.searchParams.set("error", "no_ad_account");
      return redirect(errUrl);
    }

    const accountId = normalizeMetaAdAccountId(first.id);
    const me = await getMetaUserProfile(accessToken);
    const pages = await getMetaPages(accessToken);
    const firstPage = pages[0] ?? null;
    const pageId = firstPage?.id ?? null;
    const igUserId = pageId ? await getMetaInstagramBusinessId(accessToken, pageId) : null;
    const accountName =
      me?.name != null ? `${first.name ?? "Ad account"} · ${me.name}` : (first.name ?? "Meta Ad Account");

    const doc = await Integration.findOneAndUpdate(
      { organizationId: state.organizationId, platform: state.platform },
      {
        $set: {
          organizationId: state.organizationId,
          platform: state.platform,
          accessToken,
          refreshToken: null,
          tokenExpiresAt,
          accountId,
          accountName,
          metadata: {
            adAccountId: accountId,
            pageId,
            pageName: firstPage?.name ?? null,
            igUserId,
            metaUserId: me?.id ?? null,
          },
          isActive: true,
          connectedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    ).lean();

    if (!doc) {
      return jsonError("Failed to save integration", 500);
    }

    void syncOrganization(state.organizationId).catch((e) => {
      console.error("[meta/callback] initial sync failed:", e);
    });

    return redirect(successUrl);
  } catch (e) {
    console.error("[meta/callback] OAuth error:", e);
    const errUrl = new URL("/integrations", req.nextUrl.origin);
    errUrl.searchParams.set("error", "meta_oauth");
    return redirect(errUrl);
  }
}
