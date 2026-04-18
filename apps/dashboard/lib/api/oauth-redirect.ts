import type { NextRequest } from "next/server";
import type { OAuthStubState } from "@/lib/api/oauth-stub";

/** Allowed next= values from integration connect routes. */
export function parseOAuthNextParam(raw: string | null): string | undefined {
  if (!raw) return undefined;
  if (raw === "/onboarding" || raw === "/integrations") return raw;
  if (/^\/agency\/clients\/[a-z0-9_-]+\/integrations\/?$/i.test(raw)) {
    return raw.replace(/\/$/, "");
  }
  return undefined;
}

/** Error redirect after OAuth (plan / limits); mirrors {@link oauthSuccessUrl} base path rules. */
export function oauthErrorUrl(req: NextRequest, state: OAuthStubState, errorCode: string): URL {
  if (state.next?.startsWith("/agency/clients/")) {
    const url = new URL(state.next, req.nextUrl.origin);
    url.searchParams.set("error", errorCode);
    return url;
  }
  const base = state.next === "/onboarding" ? "/onboarding" : "/integrations";
  const url = new URL(base, req.nextUrl.origin);
  url.searchParams.set("error", errorCode);
  return url;
}

/** Success redirect after OAuth; includes connected= query for onboarding / integrations UI. */
export function oauthSuccessUrl(req: NextRequest, state: OAuthStubState, connectedParam: string): URL {
  if (state.next?.startsWith("/agency/clients/")) {
    const url = new URL(state.next, req.nextUrl.origin);
    url.searchParams.set("connected", connectedParam);
    return url;
  }
  const base = state.next === "/onboarding" ? "/onboarding" : "/integrations";
  const url = new URL(base, req.nextUrl.origin);
  url.searchParams.set("connected", connectedParam);
  return url;
}
