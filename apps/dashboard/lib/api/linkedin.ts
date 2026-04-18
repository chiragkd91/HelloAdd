import type { LinkedInAdAccount, LinkedInCampaign, LinkedInMetrics } from "@/types/linkedin";

const LI_API = "https://api.linkedin.com";
/** Marketing API version header (task used 202401; bump when you adopt newer API releases). */
const LINKEDIN_VERSION = "202401";
const RATE_LIMIT_RETRY_MS = 60_000;
const MAX_RATE_LIMIT_RETRIES = 1;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapLiError(status: number, body: string): Error {
  if (status === 401) return new Error("LINKEDIN_TOKEN_EXPIRED");
  if (status === 429) return new Error("LINKEDIN_RATE_LIMIT");
  if (status === 404 || status === 400) return new Error("LINKEDIN_INVALID_ACCOUNT");
  return new Error(`LINKEDIN_REQUEST_FAILED:${status}:${body.slice(0, 200)}`);
}

async function liGet(
  accessToken: string,
  path: string,
  searchParams: Record<string, string>,
  rateLimitAttempt = 0
) {
  const url = new URL(`${LI_API}${path}`);
  for (const [k, v] of Object.entries(searchParams)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    next: { revalidate: 0 },
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 429 && rateLimitAttempt < MAX_RATE_LIMIT_RETRIES) {
      await sleep(RATE_LIMIT_RETRY_MS);
      return liGet(accessToken, path, searchParams, rateLimitAttempt + 1);
    }
    throw mapLiError(res.status, text);
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("LINKEDIN_INVALID_RESPONSE");
  }
}

function parseElements<T>(data: Record<string, unknown>, map: (el: Record<string, unknown>) => T | null): T[] {
  const elements = data.elements;
  if (!Array.isArray(elements)) return [];
  const out: T[] = [];
  for (const el of elements) {
    if (el && typeof el === "object") {
      const item = map(el as Record<string, unknown>);
      if (item != null) out.push(item);
    }
  }
  return out;
}

/**
 * Search ad accounts the member can access.
 * @see https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-accounts
 */
export async function getLinkedInAdAccounts(accessToken: string): Promise<LinkedInAdAccount[]> {
  const data = await liGet(accessToken, "/v2/adAccountsV2", {
    q: "search",
  });
  return parseElements(data, (el) => {
    const id = el.id;
    if (id == null) return null;
    const idStr = String(id);
    const name = typeof el.name === "string" ? el.name : undefined;
    const urn = typeof el.reference === "string" ? el.reference : `urn:li:sponsoredAccount:${idStr}`;
    return { id: idStr, name, urn };
  });
}

export async function getLinkedInMemberUrn(accessToken: string): Promise<string | null> {
  try {
    const data = await liGet(accessToken, "/v2/me", {});
    const id = data.id;
    if (typeof id !== "string" || id.trim().length === 0) return null;
    return `urn:li:person:${id}`;
  } catch {
    return null;
  }
}

/**
 * Campaigns for a sponsored account URN or numeric account id.
 */
export async function getLinkedInCampaigns(
  accessToken: string,
  accountId: string
): Promise<LinkedInCampaign[]> {
  const accountUrn = accountId.startsWith("urn:")
    ? accountId
    : `urn:li:sponsoredAccount:${accountId}`;

  const url = new URL(`${LI_API}/v2/adCampaignsV2`);
  url.searchParams.set("q", "search");
  url.searchParams.set("search.account.values[0]", accountUrn);
  url.searchParams.set("projection", "(elements*(id,name,status,totalBudget,runSchedule))");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    next: { revalidate: 0 },
  });
  const text = await res.text();
  if (!res.ok) {
    throw mapLiError(res.status, text);
  }
  const data = JSON.parse(text) as Record<string, unknown>;
  return parseElements(data, (el) => {
    const id = el.id;
    if (id == null) return null;
    return {
      id: typeof id === "number" ? id : Number(id),
      name: String(el.name ?? ""),
      status: String(el.status ?? ""),
      totalBudget: el.totalBudget as LinkedInCampaign["totalBudget"],
      runSchedule: el.runSchedule,
    };
  });
}

function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.slice(0, 10).split("-").map((x) => Number(x));
  return { year: y, month: m, day: d };
}

/**
 * Daily analytics for a campaign over a date range (aggregated sum in this implementation).
 */
export async function getLinkedInCampaignMetrics(
  accessToken: string,
  campaignId: string,
  dateRange: { start: string; end: string }
): Promise<LinkedInMetrics> {
  const start = parseIsoDate(dateRange.start);
  const end = parseIsoDate(dateRange.end);
  const campaignUrn = campaignId.startsWith("urn:")
    ? campaignId
    : `urn:li:sponsoredCampaign:${campaignId}`;

  const url = new URL(`${LI_API}/v2/adAnalyticsV2`);
  url.searchParams.set("q", "analytics");
  url.searchParams.set("pivot", "CAMPAIGN");
  url.searchParams.set("timeGranularity", "DAILY");
  url.searchParams.set("campaigns[0]", campaignUrn);
  url.searchParams.set("dateRange.start.year", String(start.year));
  url.searchParams.set("dateRange.start.month", String(start.month));
  url.searchParams.set("dateRange.start.day", String(start.day));
  url.searchParams.set("dateRange.end.year", String(end.year));
  url.searchParams.set("dateRange.end.month", String(end.month));
  url.searchParams.set("dateRange.end.day", String(end.day));
  url.searchParams.set("fields", "impressions,clicks,costInLocalCurrency,clickThroughRate,leads");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    next: { revalidate: 0 },
  });
  const text = await res.text();
  if (!res.ok) {
    throw mapLiError(res.status, text);
  }
  const data = JSON.parse(text) as Record<string, unknown>;
  const elements = data.elements;
  if (!Array.isArray(elements) || elements.length === 0) {
    return {
      impressions: 0,
      clicks: 0,
      costInLocalCurrency: 0,
      clickThroughRate: 0,
    };
  }

  let impressions = 0;
  let clicks = 0;
  let cost = 0;
  let ctrWeighted = 0;
  let leads = 0;
  let impForCtr = 0;

  for (const row of elements) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const imp = Number(r.impressions ?? 0);
    const clk = Number(r.clicks ?? 0);
    impressions += imp;
    clicks += clk;
    cost += Number(r.costInLocalCurrency ?? 0);
    leads += Number(r.leads ?? 0);
    const ctr = Number(r.clickThroughRate ?? 0);
    if (imp > 0) {
      ctrWeighted += ctr * imp;
      impForCtr += imp;
    }
  }

  return {
    impressions,
    clicks,
    costInLocalCurrency: cost,
    clickThroughRate: impForCtr > 0 ? ctrWeighted / impForCtr : 0,
    leads,
  };
}

export type LinkedInOAuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
};

export async function exchangeLinkedInOAuthCode(
  code: string,
  redirectUri: string
): Promise<LinkedInOAuthTokens> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("LINKEDIN_OAUTH_NOT_CONFIGURED");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`LINKEDIN_OAUTH_TOKEN_ERROR:${res.status}:${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new Error("LINKEDIN_OAUTH_NO_ACCESS_TOKEN");
  }
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

export async function refreshLinkedInAccessToken(refreshToken: string): Promise<LinkedInOAuthTokens> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("LINKEDIN_OAUTH_NOT_CONFIGURED");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`LINKEDIN_REFRESH_FAILED:${res.status}:${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new Error("LINKEDIN_REFRESH_NO_ACCESS_TOKEN");
  }
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

export async function publishLinkedInPost(
  accessToken: string,
  authorUrn: string,
  text: string
): Promise<string> {
  const res = await fetch(`${LI_API}/v2/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw mapLiError(res.status, body);
  }
  const id = res.headers.get("x-restli-id");
  if (id && id.trim().length > 0) return id;
  try {
    const json = JSON.parse(body) as { id?: string };
    if (json.id) return json.id;
  } catch {
    // no-op
  }
  return `linkedin:${Date.now()}`;
}

export type LinkedInOrganicEngagement = {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  impressions: number | null;
};

/**
 * Organic engagement for a LinkedIn UGC/share post.
 * Uses Social Actions API for likes/comments summary.
 */
export async function getLinkedInPostEngagement(
  accessToken: string,
  externalPostId: string
): Promise<LinkedInOrganicEngagement> {
  const rawId = externalPostId.trim();
  const encodedUrn = encodeURIComponent(
    rawId.startsWith("urn:li:")
      ? rawId
      : rawId.includes(":")
        ? `urn:li:ugcPost:${rawId.split(":").pop() ?? rawId}`
        : `urn:li:ugcPost:${rawId}`
  );
  const data = await liGet(accessToken, `/v2/socialActions/${encodedUrn}`, {});
  const likes = (
    data.likesSummary as { totalLikes?: number } | undefined
  )?.totalLikes;
  const comments = (
    data.commentsSummary as { totalFirstLevelComments?: number } | undefined
  )?.totalFirstLevelComments;

  return {
    likes: typeof likes === "number" ? likes : null,
    comments: typeof comments === "number" ? comments : null,
    shares: null,
    impressions: null,
  };
}
