import { DEFAULT_PUBLIC_DASHBOARD_ORIGIN } from "@helloadd/public-origins";

/** Base URL for dashboard API (session cookie is set on this origin). */
export const DASHBOARD_API =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "")) ||
  DEFAULT_PUBLIC_DASHBOARD_ORIGIN;

/**
 * Dashboard auth pages (same origin as the session cookie).
 * Use these for marketing CTAs so users hit `app.*` even when apex `/login` / `/register`
 * are mis-handled by the reverse proxy (self-redirect loop).
 */
export const DASHBOARD_LOGIN_URL = `${DASHBOARD_API}/login`;
export const DASHBOARD_REGISTER_URL = `${DASHBOARD_API}/register`;
