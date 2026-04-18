/** Public dashboard origin (no trailing slash) — verification links, redirects. */
export function dashboardPublicBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:3001";
}
