/**
 * Google Ads API v17 (REST) — Task 2.2
 * - `customers:listAccessibleCustomers`, `googleAds:search` for campaigns + metrics
 * - OAuth: `exchangeGoogleOAuthCode` / `refreshGoogleAccessToken`
 */
import type { GoogleCampaign, GoogleCustomer, GoogleMetrics } from "@/types/google";

const GOOGLE_ADS_API = "https://googleads.googleapis.com/v17";

/** One retry after 60s on HTTP 429 (parity with Meta API helper). */
const RATE_LIMIT_RETRY_MS = 60_000;
const MAX_RATE_LIMIT_RETRIES = 1;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`GOOGLE_CONFIG_MISSING:${name}`);
  return v;
}

export function normalizeGoogleCustomerId(customerId: string): string {
  return customerId.replace(/^customers\//, "").replace(/-/g, "").trim();
}

function adsHeaders(
  accessToken: string,
  developerToken: string,
  init?: RequestInit
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.method === "POST" || init?.body) {
    headers["Content-Type"] = "application/json";
  }
  /** Manager / MCC access: optional; set when API returns LOGIN_CUSTOMER_ID_REQUIRED */
  const loginId = process.env.GOOGLE_LOGIN_CUSTOMER_ID?.replace(/-/g, "").trim();
  if (loginId) {
    headers["login-customer-id"] = loginId;
  }
  return headers;
}

async function adsRequest<T>(
  accessToken: string,
  developerToken: string,
  path: string,
  init?: RequestInit,
  rateLimitAttempt = 0
): Promise<T> {
  const headers = adsHeaders(accessToken, developerToken, init);
  const res = await fetch(`${GOOGLE_ADS_API}${path}`, {
    ...init,
    headers,
    next: { revalidate: 0 },
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 429 && rateLimitAttempt < MAX_RATE_LIMIT_RETRIES) {
      await sleep(RATE_LIMIT_RETRY_MS);
      return adsRequest<T>(accessToken, developerToken, path, init, rateLimitAttempt + 1);
    }
    if (res.status === 401) throw new Error("GOOGLE_TOKEN_EXPIRED");
    if (res.status === 429) throw new Error("GOOGLE_RATE_LIMIT");
    throw new Error(`GOOGLE_ADS_ERROR:${res.status}:${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("GOOGLE_ADS_INVALID_RESPONSE");
  }
}

/**
 * Lists Google Ads accounts the user can access.
 * @see https://developers.google.com/google-ads/api/rest/reference/rest/v17/customers/listAccessibleCustomers
 */
export async function getGoogleCustomers(
  accessToken: string,
  developerToken: string
): Promise<GoogleCustomer[]> {
  const data = await adsRequest<{ resourceNames?: string[] }>(
    accessToken,
    developerToken,
    "/customers:listAccessibleCustomers",
    { method: "GET" }
  );
  const names = data.resourceNames ?? [];
  return names.map((resourceName) => {
    const id = resourceName.replace(/^customers\//, "");
    return { id, resourceName };
  });
}

type SearchRow = {
  campaign?: {
    id?: string | number;
    name?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    start_date?: string;
    end_date?: string;
  };
  metrics?: {
    impressions?: string | number;
    clicks?: string | number;
    costMicros?: string | number;
    ctr?: number | string;
    averageCpc?: string | number;
    average_cpc?: string | number;
    conversions?: string | number;
  };
};

function parseSearchResults<T>(data: { results?: SearchRow[] }, map: (row: SearchRow) => T | null): T[] {
  const out: T[] = [];
  for (const row of data.results ?? []) {
    const item = map(row);
    if (item != null) out.push(item);
  }
  return out;
}

export async function getGoogleCampaigns(
  accessToken: string,
  developerToken: string,
  customerId: string
): Promise<GoogleCampaign[]> {
  const cid = normalizeGoogleCustomerId(customerId);
  const query = `
    SELECT campaign.id, campaign.name, campaign.status, campaign.start_date, campaign.end_date,
           campaign.advertising_channel_type
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
  `.replace(/\s+/g, " ");

  const data = await adsRequest<{ results?: SearchRow[] }>(
    accessToken,
    developerToken,
    `/customers/${cid}/googleAds:search`,
    {
      method: "POST",
      body: JSON.stringify({ query: query.trim() }),
    }
  );

  return parseSearchResults(data, (row) => {
    const c = row.campaign;
    if (c?.id == null) return null;
    return {
      id: String(c.id),
      name: c.name ?? "",
      status: String(c.status ?? ""),
      startDate: c.startDate ?? c.start_date ?? "",
      endDate: c.endDate ?? c.end_date ?? "",
    };
  });
}

export async function getGoogleCampaignMetrics(
  accessToken: string,
  developerToken: string,
  customerId: string,
  campaignId: string,
  dateRange: { start: string; end: string }
): Promise<GoogleMetrics> {
  // Validate inputs before interpolating into GAQL
  if (!/^\d+$/.test(campaignId)) throw new Error("GOOGLE_INVALID_CAMPAIGN_ID");
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateRange.start) || !datePattern.test(dateRange.end)) {
    throw new Error("GOOGLE_INVALID_DATE_RANGE");
  }

  const cid = normalizeGoogleCustomerId(customerId);
  const query = `
    SELECT campaign.id,
           metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr,
           metrics.average_cpc, metrics.conversions
    FROM campaign
    WHERE campaign.id = ${campaignId}
      AND segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
  `.replace(/\s+/g, " ");

  const data = await adsRequest<{ results?: SearchRow[] }>(
    accessToken,
    developerToken,
    `/customers/${cid}/googleAds:search`,
    {
      method: "POST",
      body: JSON.stringify({ query: query.trim() }),
    }
  );

  let impressions = 0;
  let clicks = 0;
  let costMicros = 0;
  let conversions = 0;
  let ctrSum = 0;
  let cpcMicrosSum = 0;
  let ctrWeight = 0;
  let n = 0;

  for (const row of data.results ?? []) {
    const m = row.metrics;
    if (!m) continue;
    n += 1;
    impressions += Number(m.impressions ?? 0);
    clicks += Number(m.clicks ?? 0);
    costMicros += Number(m.costMicros ?? 0);
    conversions += Number(m.conversions ?? 0);
    const cpc = m.averageCpc ?? m.average_cpc;
    if (cpc != null) {
      cpcMicrosSum += Number(cpc);
    }
    const imp = Number(m.impressions ?? 0);
    const ctrVal = typeof m.ctr === "number" ? m.ctr : Number(m.ctr ?? 0);
    if (imp > 0) {
      ctrSum += ctrVal * imp;
      ctrWeight += imp;
    }
  }

  const ctr = ctrWeight > 0 ? ctrSum / ctrWeight : 0;
  const averageCpcMicros = n > 0 ? cpcMicrosSum / n : undefined;

  return {
    impressions,
    clicks,
    costMicros,
    ctr,
    conversions,
    averageCpcMicros,
  };
}

export type GoogleOAuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
};

/**
 * Exchange authorization code for tokens (initial OAuth callback).
 */
export async function exchangeGoogleOAuthCode(
  code: string,
  redirectUri: string
): Promise<GoogleOAuthTokens> {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GOOGLE_OAUTH_TOKEN_ERROR:${res.status}:${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new Error("GOOGLE_OAUTH_NO_ACCESS_TOKEN");
  }
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

/**
 * Refresh a short-lived access token using the refresh token.
 */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleOAuthTokens> {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GOOGLE_REFRESH_FAILED:${res.status}:${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new Error("GOOGLE_REFRESH_NO_ACCESS_TOKEN");
  }
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}
