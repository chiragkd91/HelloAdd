/** Base URL for dashboard API (session cookie is set on this origin). */
export const DASHBOARD_API =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "")) ||
  "http://localhost:3001";
