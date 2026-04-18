import { NextRequest, NextResponse } from "next/server";
import {
  CLIENT_PORTAL_COOKIE_NAME,
  verifyClientPortalToken,
} from "@/lib/clientPortal/token";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const origin = req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL(`/client/access?error=missing`, origin));
  }

  const payload = verifyClientPortalToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL(`/client/access?error=invalid`, origin));
  }

  const maxAge = Math.max(60, payload.exp - Math.floor(Date.now() / 1000));
  const res = NextResponse.redirect(new URL(`/client/${payload.clientOrgId}/overview`, origin));
  res.cookies.set(CLIENT_PORTAL_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
