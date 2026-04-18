import { connectMongo, Integration } from "@helloadd/database";
import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleOAuthCode, getGoogleCustomers } from "@/lib/api/google";
import { assertAgencyOAuthGates } from "@/lib/agency/agencyPlanEnforcement";
import { jsonDbUnavailable, jsonError } from "@/lib/api/http";
import { isValidOAuthOrganizationId } from "@/lib/api/oauth-org-id";
import { oauthErrorUrl, oauthSuccessUrl } from "@/lib/api/oauth-redirect";
import { decodeState } from "@/lib/api/oauth-stub";
import { syncOrganization } from "@/lib/sync/syncEngine";

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const { searchParams } = new URL(req.url);
  const oauthError = searchParams.get("error");
  const code = searchParams.get("code");
  const state = decodeState(searchParams.get("state"));

  if (oauthError) {
    const errUrl = new URL("/integrations", req.nextUrl.origin);
    errUrl.searchParams.set("error", "google_denied");
    const res = NextResponse.redirect(errUrl);
    res.cookies.delete("oauth_csrf");
    return res;
  }

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
  if (state.provider !== "google" || (state.platform !== "GOOGLE" && state.platform !== "YOUTUBE")) {
    return jsonError("Invalid OAuth state provider/platform", 400);
  }

  // Burn the CSRF cookie on every redirect response from this point on
  function redirect(url: URL | string): NextResponse {
    const res = NextResponse.redirect(url);
    res.cookies.delete("oauth_csrf");
    return res;
  }

  const redirectUri = new URL("/api/integrations/google/callback", req.nextUrl.origin).toString();
  const successUrl = oauthSuccessUrl(req, state, "google");

  const gatedPlatform = state.platform === "YOUTUBE" ? "YOUTUBE" : "GOOGLE";
  const targetPlatform = "GOOGLE";

  const agencyGate = await assertAgencyOAuthGates(state.organizationId, gatedPlatform, "google");
  if (agencyGate) {
    return redirect(oauthErrorUrl(req, state, agencyGate));
  }

  if (code === "demo_oauth_code") {
    await Integration.findOneAndUpdate(
      { organizationId: state.organizationId, platform: targetPlatform },
      {
        $set: {
          organizationId: state.organizationId,
          platform: targetPlatform,
          accessToken: `oauth_stub_${code}`,
          refreshToken: null,
          tokenExpiresAt: null,
          accountId: `google_${state.organizationId.slice(0, 8)}`,
          accountName: "Google Ads (stub)",
          metadata: {
            adAccountId: `google_${state.organizationId.slice(0, 8)}`,
            customerIds: [],
          },
          isActive: true,
          connectedAt: new Date(),
        },
      },
      { upsert: true }
    );
    return redirect(successUrl);
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return jsonError("Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)", 500);
  }

  try {
    const tokens = await exchangeGoogleOAuthCode(code, redirectUri);
    let accountId = `google_${state.organizationId.slice(0, 8)}`;
    let accountName = "Google Ads";
    let customerIds: string[] = [];

    const devToken = process.env.GOOGLE_DEVELOPER_TOKEN;
    if (devToken) {
      try {
        const customers = await getGoogleCustomers(tokens.accessToken, devToken);
        customerIds = customers.map((c) => c.id);
        const first = customers[0];
        if (first) {
          accountId = first.id;
          accountName = `Google Ads (${first.id})`;
        }
      } catch {
        accountName = "Google Ads (connected — set GOOGLE_DEVELOPER_TOKEN to list accounts)";
      }
    } else {
      accountName = "Google Ads (add GOOGLE_DEVELOPER_TOKEN to resolve account id)";
    }

    const doc = await Integration.findOneAndUpdate(
      { organizationId: state.organizationId, platform: targetPlatform },
      {
        $set: {
          organizationId: state.organizationId,
          platform: targetPlatform,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          accountId,
          accountName,
          metadata: {
            adAccountId: accountId,
            customerIds,
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
      console.error("[google/callback] initial sync failed:", e);
    });

    return redirect(successUrl);
  } catch (e) {
    console.error("[google/callback] OAuth error:", e);
    const errUrl = new URL("/integrations", req.nextUrl.origin);
    errUrl.searchParams.set("error", "google_oauth");
    return redirect(errUrl);
  }
}
