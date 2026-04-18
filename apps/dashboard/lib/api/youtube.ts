/** YouTube Data API wrapper — organic engagement helpers. */

const YT_API = "https://www.googleapis.com/youtube/v3";

export type YouTubeVideoEngagement = {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  impressions: number | null;
};

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function joinParts(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function normalizeVideoId(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(t)) return t;
  try {
    const u = new URL(t);
    const host = u.hostname.toLowerCase();
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const candidate = parts[parts.length - 1];
      if (candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate)) return candidate;
    }
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
  } catch {
    // not a URL
  }
  return null;
}

async function downloadMediaForUpload(mediaUrl: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  let parsed: URL;
  try {
    parsed = new URL(mediaUrl);
  } catch {
    throw new Error("YOUTUBE_MEDIA_URL_INVALID");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("YOUTUBE_MEDIA_URL_INVALID");
  }

  const res = await fetch(parsed.toString(), { method: "GET", next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`YOUTUBE_MEDIA_DOWNLOAD_FAILED:${res.status}`);
  }
  const contentType = (res.headers.get("content-type") ?? "application/octet-stream").toLowerCase();
  if (!contentType.startsWith("video/")) {
    throw new Error(`YOUTUBE_MEDIA_NOT_VIDEO:${contentType}`);
  }
  const arr = new Uint8Array(await res.arrayBuffer());
  if (arr.length === 0) {
    throw new Error("YOUTUBE_MEDIA_EMPTY");
  }
  return { bytes: arr, contentType };
}

/**
 * Reads public engagement metrics from YouTube Data API `videos.list`.
 * Requires OAuth token with YouTube Data API access.
 */
export async function getYouTubeVideoEngagement(
  accessToken: string,
  externalPostId: string
): Promise<YouTubeVideoEngagement> {
  const videoId = normalizeVideoId(externalPostId);
  if (!videoId) {
    throw new Error("YOUTUBE_INVALID_VIDEO_ID");
  }

  const url = new URL(`${YT_API}/videos`);
  url.searchParams.set("part", "statistics");
  url.searchParams.set("id", videoId);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401) throw new Error("YOUTUBE_TOKEN_EXPIRED");
    if (res.status === 403) throw new Error("YOUTUBE_FORBIDDEN");
    if (res.status === 404) throw new Error("YOUTUBE_VIDEO_NOT_FOUND");
    throw new Error(`YOUTUBE_REQUEST_FAILED:${res.status}:${text.slice(0, 200)}`);
  }
  const json = JSON.parse(text) as {
    items?: Array<{
      statistics?: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
      };
    }>;
  };
  const row = Array.isArray(json.items) ? json.items[0] : null;
  if (!row?.statistics) {
    throw new Error("YOUTUBE_VIDEO_NOT_FOUND");
  }
  const stats = row.statistics;
  return {
    likes: stats.likeCount != null ? Number(stats.likeCount) : null,
    comments: stats.commentCount != null ? Number(stats.commentCount) : null,
    shares: null,
    impressions: stats.viewCount != null ? Number(stats.viewCount) : null,
  };
}

/**
 * Uploads a video to YouTube and returns the created video ID.
 * Uses multipart upload (`uploadType=multipart`) with video bytes from a URL.
 */
export async function publishYouTubeVideo(
  accessToken: string,
  mediaUrl: string,
  title: string,
  description: string,
  privacyStatus: "public" | "private" | "unlisted" = "unlisted"
): Promise<string> {
  const { bytes, contentType } = await downloadMediaForUpload(mediaUrl);
  const boundary = `yt_upload_${Date.now().toString(36)}`;
  const metadata = {
    snippet: {
      title: title.trim().slice(0, 100) || "Scheduled Upload",
      description: description.trim().slice(0, 5000),
    },
    status: {
      privacyStatus,
    },
  };

  const preamble = utf8(
    `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`
  );
  const ending = utf8(`\r\n--${boundary}--\r\n`);
  const body = joinParts([preamble, bytes, ending]);

  const url = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
  url.searchParams.set("part", "snippet,status");
  url.searchParams.set("uploadType", "multipart");
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: Buffer.from(body),
    next: { revalidate: 0 },
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401) throw new Error("YOUTUBE_TOKEN_EXPIRED");
    if (res.status === 403) throw new Error(`YOUTUBE_FORBIDDEN:${text.slice(0, 200)}`);
    throw new Error(`YOUTUBE_UPLOAD_FAILED:${res.status}:${text.slice(0, 200)}`);
  }
  const json = JSON.parse(text) as { id?: string };
  if (!json.id || !/^[a-zA-Z0-9_-]{11}$/.test(json.id)) {
    throw new Error("YOUTUBE_UPLOAD_NO_VIDEO_ID");
  }
  return json.id;
}
