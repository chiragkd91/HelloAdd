import { createHmac } from "node:crypto";

export const CLIENT_PORTAL_COOKIE_NAME = "client_portal";

/** Only used when NODE_ENV=development and no env secret is set — not for production. */
const DEV_FALLBACK_SECRET = "helloadd-dev-client-portal-secret";

let loggedDevFallbackWarning = false;

export function getClientPortalSecret(): string | null {
  const s = process.env.CLIENT_PORTAL_SECRET?.trim();
  if (s) return s;
  const n = process.env.NEXTAUTH_SECRET?.trim();
  if (n) return n;
  if (process.env.NODE_ENV === "development") {
    if (!loggedDevFallbackWarning) {
      loggedDevFallbackWarning = true;
      console.warn(
        "[client-portal] No CLIENT_PORTAL_SECRET or NEXTAUTH_SECRET — using a dev-only signing key. Set one of those in .env for production or `next start`.",
      );
    }
    return DEV_FALLBACK_SECRET;
  }
  return null;
}

export type ClientPortalPayload = {
  clientOrgId: string;
  agencyOrgId: string;
  exp: number;
};

export function signClientPortalToken(args: {
  clientOrgId: string;
  agencyOrgId: string;
  expiresInSeconds?: number;
}): string {
  const secret = getClientPortalSecret();
  if (!secret) {
    throw new Error("CLIENT_PORTAL_SECRET or NEXTAUTH_SECRET must be set for client portal links");
  }
  const exp = Math.floor(Date.now() / 1000) + (args.expiresInSeconds ?? 30 * 24 * 60 * 60);
  const payload = Buffer.from(
    JSON.stringify({
      c: args.clientOrgId,
      a: args.agencyOrgId,
      exp,
    } satisfies { c: string; a: string; exp: number }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyClientPortalToken(token: string): ClientPortalPayload | null {
  const secret = getClientPortalSecret();
  if (!secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (sig.length !== expected.length) return null;
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) return null;
  try {
    const raw = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      c: string;
      a: string;
      exp: number;
    };
    if (typeof raw.exp !== "number" || raw.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof raw.c !== "string" || typeof raw.a !== "string") return null;
    return { clientOrgId: raw.c, agencyOrgId: raw.a, exp: raw.exp };
  } catch {
    return null;
  }
}
