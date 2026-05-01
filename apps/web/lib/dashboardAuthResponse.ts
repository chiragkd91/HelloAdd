/**
 * Dashboard auth routes return JSON; proxies sometimes return HTML on 5xx.
 * Avoid treating parse failures as generic "network" errors.
 */
export async function parseDashboardAuthJson<T extends object>(r: Response): Promise<T | null> {
  const text = await r.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function dashboardAuthNonJsonMessage(r: Response): string {
  if (!r.ok && r.status >= 500) {
    return `The server is temporarily unavailable (HTTP ${r.status}). Try again in a few minutes.`;
  }
  if (!r.ok) {
    return `Request failed (HTTP ${r.status}). Try again or contact support.`;
  }
  return "Unexpected response from the server. Please try again.";
}
