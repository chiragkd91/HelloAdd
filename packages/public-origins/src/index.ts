/**
 * Production defaults when NEXT_PUBLIC_* env vars are unset at build/runtime.
 * For local development, set NEXT_PUBLIC_DASHBOARD_URL / NEXT_PUBLIC_MARKETING_URL in .env.local.
 *
 * @see helloadd/deploy/PRODUCTION-URLS.txt
 */
export const DEFAULT_PUBLIC_DASHBOARD_ORIGIN = "https://app.helloadd.online";
export const DEFAULT_PUBLIC_MARKETING_ORIGIN = "https://helloadd.online";

/** Canonical `www` marketing host — include in CORS allowlist alongside non-www. */
export const DEFAULT_PUBLIC_MARKETING_ORIGIN_WWW = "https://www.helloadd.online";

/** Local marketing dev server (apps/web `next dev` default port). */
export const DEFAULT_LOCAL_MARKETING_ORIGIN = "http://localhost:30002";
