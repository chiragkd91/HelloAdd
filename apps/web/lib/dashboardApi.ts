import { DEFAULT_PUBLIC_DASHBOARD_ORIGIN } from "@helloadd/public-origins";

/** Base URL for dashboard API (session cookie is set on this origin). */
export const DASHBOARD_API =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "")) ||
  DEFAULT_PUBLIC_DASHBOARD_ORIGIN;
