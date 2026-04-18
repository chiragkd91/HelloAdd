import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import type { OrgRole, UserAttrs } from "@helloadd/database";
import { Organization } from "@helloadd/database";
import { jsonError } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

export async function requireAgencyManager(req: NextRequest): Promise<
  | { ok: true; user: UserAttrs; organizationId: string; role: OrgRole }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth;

  const org = await Organization.findById(auth.organizationId).lean();
  if (!org?.isAgency) {
    return { ok: false, response: jsonError("Agency workspace required", 403) };
  }

  return { ok: true, user: auth.user, organizationId: auth.organizationId, role: auth.role };
}
