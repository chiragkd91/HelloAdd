import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { jsonDbUnavailable, jsonError } from "@/lib/api/http";
import { resolveRequestUser } from "@/lib/api/session";
import type { UserAttrs } from "@helloadd/database";

export async function requireUserAndOrg(req: NextRequest): Promise<
  | { ok: true; user: UserAttrs; organizationId: string }
  | { ok: false; response: NextResponse }
> {
  try {
    const { user, organizationId } = await resolveRequestUser(req);
    if (!user) {
      return { ok: false, response: jsonError("Unauthorized", 401) };
    }
    if (!organizationId) {
      return { ok: false, response: jsonError("No organization context — join or create an org first", 400) };
    }
    return { ok: true, user, organizationId };
  } catch (e) {
    return { ok: false, response: jsonDbUnavailable(e) };
  }
}
