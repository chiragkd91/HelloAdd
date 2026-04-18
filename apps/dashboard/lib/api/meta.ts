import type { MetaAdAccount, MetaCampaign, MetaInsights } from "@/types/platform";

const GRAPH_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

/** One retry after 60s when Graph returns 429 (per Task 2.1). */
const RATE_LIMIT_RETRY_MS = 60_000;
const MAX_RATE_LIMIT_RETRIES = 1;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapMetaHttpError(status: number, bodyText: string): Error {
  if (status === 401 || /OAuthException|session has been invalidated|expired/i.test(bodyText)) {
    return new Error("META_TOKEN_EXPIRED");
  }
  if (status === 429) {
    return new Error("META_RATE_LIMIT");
  }
  if (status === 400 && /invalid|not found/i.test(bodyText)) {
    return new Error("META_INVALID_ACCOUNT");
  }
  return new Error(`META_REQUEST_FAILED: ${status}`);
}

async function graphGet(
  accessToken: string,
  path: string,
  searchParams: Record<string, string>,
  rateLimitAttempt = 0
): Promise<Record<string, unknown> & { data?: unknown; error?: { message?: string; code?: number } }> {
  const url = new URL(`${GRAPH_BASE}${path.startsWith("/") ? "" : "/"}${path}`);
  for (const [k, v] of Object.entries(searchParams)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  });
  const text = await res.text();
  if (!res.ok) {
    const err = mapMetaHttpError(res.status, text);
    if (err.message === "META_RATE_LIMIT" && rateLimitAttempt < MAX_RATE_LIMIT_RETRIES) {
      await sleep(RATE_LIMIT_RETRY_MS);
      return graphGet(accessToken, path, searchParams, rateLimitAttempt + 1);
    }
    throw err;
  }
  try {
    const json = JSON.parse(text) as Record<string, unknown> & {
      error?: { message?: string; code?: number };
    };
    if (json.error) {
      const msg = json.error.message ?? JSON.stringify(json.error);
      if (/expired|invalid.*token|session/i.test(msg)) {
        throw new Error("META_TOKEN_EXPIRED");
      }
      throw new Error(`META_REQUEST_FAILED: ${msg}`);
    }
    return json;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("META_")) throw e;
    throw new Error("META_INVALID_ACCOUNT");
  }
}

/** Graph returns `act_123` or `123` — normalize for storage and API paths. */
export function normalizeMetaAdAccountId(id: string): string {
  const t = id.trim();
  if (t.startsWith("act_")) return t;
  return `act_${t}`;
}

export async function getMetaUserProfile(
  accessToken: string
): Promise<{ id: string; name?: string } | null> {
  try {
    const data = await graphGet(accessToken, "/me", { fields: "id,name" });
    const raw = data as { id?: string; name?: string };
    if (typeof raw.id !== "string") return null;
    return { id: raw.id, name: typeof raw.name === "string" ? raw.name : undefined };
  } catch {
    return null;
  }
}

export async function getMetaAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const data = await graphGet(accessToken, "/me/adaccounts", {
    fields: "id,name,account_status,currency,spend_cap",
  });
  const list = data.data;
  if (!Array.isArray(list)) return [];
  return list as MetaAdAccount[];
}

export async function getMetaPages(
  accessToken: string
): Promise<Array<{ id: string; name?: string; access_token?: string }>> {
  const data = await graphGet(accessToken, "/me/accounts", {
    fields: "id,name,access_token",
  });
  const list = data.data;
  if (!Array.isArray(list)) return [];
  return list as Array<{ id: string; name?: string; access_token?: string }>;
}

export async function getMetaInstagramBusinessId(
  accessToken: string,
  pageId: string
): Promise<string | null> {
  const data = await graphGet(accessToken, `/${pageId}`, {
    fields: "instagram_business_account{id}",
  });
  const iba = (data as { instagram_business_account?: { id?: string } }).instagram_business_account;
  return iba?.id ?? null;
}

/**
 * List campaigns for an ad account. Graph `/{ad-account-id}/campaigns` does not use `time_range`
 * (that applies to insights); listing is for current campaign objects only.
 */
export async function getMetaCampaigns(accessToken: string, adAccountId: string): Promise<MetaCampaign[]> {
  const accountPath = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const data = await graphGet(accessToken, `/${accountPath}/campaigns`, {
    fields: "id,name,status,daily_budget,lifetime_budget,start_time,stop_time,objective",
  });
  const list = data.data;
  if (!Array.isArray(list)) return [];
  return list as MetaCampaign[];
}

export async function getMetaCampaignInsights(
  accessToken: string,
  campaignId: string,
  dateRange: { since: string; until: string }
): Promise<MetaInsights> {
  const timeRange = JSON.stringify({ since: dateRange.since, until: dateRange.until });
  const data = await graphGet(accessToken, `/${campaignId}/insights`, {
    fields: "impressions,clicks,spend,ctr,cpc,reach,actions",
    time_range: timeRange,
  });
  const list = data.data;
  const row = Array.isArray(list) && list.length > 0 ? (list[0] as Record<string, string>) : null;
  if (!row) {
    return {
      impressions: "0",
      clicks: "0",
      spend: "0",
      ctr: "0",
      cpc: "0",
    };
  }
  const actionsRaw = row.actions;
  const actions = Array.isArray(actionsRaw)
    ? (actionsRaw as MetaInsights["actions"])
    : undefined;

  return {
    impressions: row.impressions ?? "0",
    clicks: row.clicks ?? "0",
    spend: row.spend ?? "0",
    ctr: row.ctr ?? "0",
    cpc: row.cpc ?? "0",
    reach: row.reach,
    actions,
  };
}

export async function publishFacebookPost(
  accessToken: string,
  pageId: string,
  message: string,
  mediaUrl?: string
): Promise<string> {
  const body = new URLSearchParams({
    message,
    access_token: accessToken,
  });
  if (mediaUrl) body.set("link", mediaUrl);
  const res = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw mapMetaHttpError(res.status, text);
  }
  const json = JSON.parse(text) as { id?: string; error?: { message?: string } };
  if (json.error || !json.id) {
    throw new Error(`META_PUBLISH_FACEBOOK_FAILED:${json.error?.message ?? "no post id"}`);
  }
  return json.id;
}

export async function publishInstagramPost(
  accessToken: string,
  igUserId: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  const createBody = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });
  const createRes = await fetch(`${GRAPH_BASE}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createBody.toString(),
  });
  const createText = await createRes.text();
  if (!createRes.ok) {
    throw mapMetaHttpError(createRes.status, createText);
  }
  const createJson = JSON.parse(createText) as { id?: string; error?: { message?: string } };
  if (createJson.error || !createJson.id) {
    throw new Error(`META_PUBLISH_INSTAGRAM_CREATE_FAILED:${createJson.error?.message ?? "no creation id"}`);
  }

  const publishBody = new URLSearchParams({
    creation_id: createJson.id,
    access_token: accessToken,
  });
  const publishRes = await fetch(`${GRAPH_BASE}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishBody.toString(),
  });
  const publishText = await publishRes.text();
  if (!publishRes.ok) {
    throw mapMetaHttpError(publishRes.status, publishText);
  }
  const publishJson = JSON.parse(publishText) as { id?: string; error?: { message?: string } };
  if (publishJson.error || !publishJson.id) {
    throw new Error(`META_PUBLISH_INSTAGRAM_FINALIZE_FAILED:${publishJson.error?.message ?? "no post id"}`);
  }
  return publishJson.id;
}

export type MetaTokenExchangeResult = {
  accessToken: string;
  tokenExpiresAt: Date | null;
};

/**
 * Exchange OAuth code for short-lived token, then long-lived (60 days) when possible.
 * `redirectUri` must match the URI used in the OAuth dialog exactly.
 */
export async function exchangeMetaOAuthCode(
  code: string,
  redirectUri: string
): Promise<MetaTokenExchangeResult> {
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("META_OAUTH_NOT_CONFIGURED");
  }

  const shortBody = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    client_secret: clientSecret,
    code,
  });

  const res = await fetch(`${GRAPH_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: shortBody.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw mapMetaHttpError(res.status, text);
  }
  const shortJson = JSON.parse(text) as {
    access_token?: string;
    error?: { message?: string; type?: string };
  };
  if (shortJson.error) {
    throw new Error(`META_OAUTH: ${shortJson.error.message ?? "token exchange failed"}`);
  }
  const shortToken = shortJson.access_token;
  if (!shortToken) {
    throw new Error("META_INVALID_ACCOUNT");
  }

  const longBody = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: shortToken,
  });

  const longRes = await fetch(`${GRAPH_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: longBody.toString(),
  });
  const longText = await longRes.text();
  if (!longRes.ok) {
    const expiresShort = new Date(Date.now() + 2 * 60 * 60 * 1000);
    return { accessToken: shortToken, tokenExpiresAt: expiresShort };
  }
  const longJson = JSON.parse(longText) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  if (longJson.error) {
    const expiresShort = new Date(Date.now() + 2 * 60 * 60 * 1000);
    return { accessToken: shortToken, tokenExpiresAt: expiresShort };
  }
  const accessToken = longJson.access_token ?? shortToken;
  const expiresIn = longJson.expires_in;
  const tokenExpiresAt =
    typeof expiresIn === "number" ? new Date(Date.now() + expiresIn * 1000) : null;
  return { accessToken, tokenExpiresAt };
}

/**
 * Extend a long-lived user token before expiry (same grant as initial long-lived exchange).
 */
export async function refreshMetaToken(accessToken: string): Promise<MetaTokenExchangeResult> {
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("META_OAUTH_NOT_CONFIGURED");
  }

  const body = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: accessToken,
  });

  const res = await fetch(`${GRAPH_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw mapMetaHttpError(res.status, text);
  }
  const json = JSON.parse(text) as { access_token?: string; expires_in?: number; error?: { message?: string } };
  if (json.error) {
    throw new Error(`META_TOKEN_REFRESH: ${json.error.message ?? "failed"}`);
  }
  if (!json.access_token) {
    throw new Error("META_TOKEN_REFRESH_FAILED");
  }
  const expiresIn = json.expires_in;
  const tokenExpiresAt =
    typeof expiresIn === "number" ? new Date(Date.now() + expiresIn * 1000) : null;
  return { accessToken: json.access_token, tokenExpiresAt };
}

/** Organic post metrics from Meta Graph (Page post or IG media). */
export type MetaOrganicEngagement = {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  impressions: number | null;
};

/**
 * Page feed post object — reactions + comments summaries + shares.
 * @see https://developers.facebook.com/docs/graph-api/reference/post
 */
export async function getFacebookPostEngagement(
  accessToken: string,
  postId: string
): Promise<MetaOrganicEngagement> {
  const data = await graphGet(accessToken, `/${postId}`, {
    fields: "reactions.summary(true),comments.summary(true),shares",
  });
  const raw = data as {
    reactions?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
    shares?: { count?: number };
  };
  const rc = raw.reactions?.summary?.total_count;
  const cc = raw.comments?.summary?.total_count;
  const sc = raw.shares?.count;
  return {
    likes: typeof rc === "number" ? rc : null,
    comments: typeof cc === "number" ? cc : null,
    shares: typeof sc === "number" ? sc : null,
    impressions: null,
  };
}

/**
 * Instagram media — public like and comment counts on the media object.
 * @see https://developers.facebook.com/docs/instagram-api/reference/ig-media
 */
export async function getInstagramMediaEngagement(
  accessToken: string,
  mediaId: string
): Promise<MetaOrganicEngagement> {
  const data = await graphGet(accessToken, `/${mediaId}`, {
    fields: "like_count,comments_count",
  });
  const raw = data as { like_count?: number; comments_count?: number };
  const lc = raw.like_count;
  const ctc = raw.comments_count;
  return {
    likes: typeof lc === "number" ? lc : null,
    comments: typeof ctc === "number" ? ctc : null,
    shares: null,
    impressions: null,
  };
}
