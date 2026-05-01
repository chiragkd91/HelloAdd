import { DEFAULT_PUBLIC_MARKETING_ORIGIN } from "@helloadd/public-origins";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Marketing site origin (no trailing slash), for credentialed cross-origin register/login from apps/web. */
export function marketingOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_MARKETING_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return DEFAULT_PUBLIC_MARKETING_ORIGIN;
}

export function applyMarketingCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get("origin");
  const allowed = marketingOrigin();
  if (origin && origin === allowed) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
    res.headers.set("Vary", "Origin");
  }
  return res;
}
