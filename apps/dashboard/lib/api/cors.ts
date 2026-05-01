import {
  DEFAULT_LOCAL_MARKETING_ORIGIN,
  DEFAULT_PUBLIC_MARKETING_ORIGIN,
  DEFAULT_PUBLIC_MARKETING_ORIGIN_WWW,
} from "@helloadd/public-origins";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Origins allowed to call credentialed auth APIs from the browser (register/login/forgot). */
function marketingOriginAllowlist(): Set<string> {
  const s = new Set<string>([
    DEFAULT_PUBLIC_MARKETING_ORIGIN,
    DEFAULT_PUBLIC_MARKETING_ORIGIN_WWW,
    DEFAULT_LOCAL_MARKETING_ORIGIN,
    "http://127.0.0.1:30002",
  ]);
  const raw = process.env.NEXT_PUBLIC_MARKETING_URL?.trim();
  if (raw) {
    const o = raw.replace(/\/$/, "");
    s.add(o);
    try {
      const host = new URL(o).hostname.toLowerCase();
      if (host === "helloadd.online" || host === "www.helloadd.online") {
        s.add(DEFAULT_PUBLIC_MARKETING_ORIGIN);
        s.add(DEFAULT_PUBLIC_MARKETING_ORIGIN_WWW);
      }
    } catch {
      /* ignore malformed NEXT_PUBLIC_MARKETING_URL */
    }
  }
  return s;
}

/** Marketing site origin (no trailing slash) — links in dashboard login, etc. */
export function marketingOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_MARKETING_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return DEFAULT_PUBLIC_MARKETING_ORIGIN;
}

export function applyMarketingCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get("origin");
  if (origin && marketingOriginAllowlist().has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
    res.headers.set("Vary", "Origin");
  }
  return res;
}
