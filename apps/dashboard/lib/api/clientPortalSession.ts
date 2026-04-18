import type { NextRequest } from "next/server";
import {
  CLIENT_PORTAL_COOKIE_NAME,
  verifyClientPortalToken,
  type ClientPortalPayload,
} from "@/lib/clientPortal/token";

export function getClientPortalPayload(req: NextRequest): ClientPortalPayload | null {
  const raw = req.cookies.get(CLIENT_PORTAL_COOKIE_NAME)?.value;
  if (!raw) return null;
  return verifyClientPortalToken(raw);
}

export function requireClientPortalForOrg(
  req: NextRequest,
  orgIdFromPath: string,
): ClientPortalPayload | null {
  const p = getClientPortalPayload(req);
  if (!p || p.clientOrgId !== orgIdFromPath) return null;
  return p;
}
