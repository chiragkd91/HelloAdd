import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import type { OrgRole, UserAttrs } from "@helloadd/database";
import { jsonError } from "@/lib/api/http";
import { getOrgMemberRole } from "@/lib/api/orgMember";
import { requireUserAndOrg } from "@/lib/api/guard";

/** Re-export for callers that import RBAC from one module (TASK 1.3). */
export { getOrgMemberRole } from "@/lib/api/orgMember";

/** Session context with org role — mirrors TASK 1.3 shape. */
export interface OrgSession {
  userId: string;
  organizationId: string;
  role: OrgRole;
}

const ROLE_ORDER: OrgRole[] = ["VIEWER", "MANAGER", "ADMIN", "OWNER"];

function roleRank(role: OrgRole | null): number {
  if (role === null) {
    return -1;
  }
  switch (role) {
    case "VIEWER":
      return 0;
    case "MANAGER":
      return 1;
    case "ADMIN":
      return 2;
    case "OWNER":
      return 3;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

/**
 * Returns true if userRole meets or exceeds minimumRole (OWNER highest, then ADMIN, MANAGER, VIEWER).
 */
export function requireRole(userRole: OrgRole | null, minimumRole: OrgRole): boolean {
  return roleRank(userRole) >= roleRank(minimumRole);
}

/** True if role matches any one of the allowed role values. */
export function hasAnyRole(userRole: OrgRole | null, allowedRoles: OrgRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

/**
 * Authenticated user must be a member of the current org with at least `minimumRole`.
 */
export async function requireUserOrgRole(
  req: NextRequest,
  minimumRole: OrgRole,
): Promise<
  | { ok: true; user: UserAttrs; organizationId: string; role: OrgRole }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) {
    return auth;
  }

  const role = await getOrgMemberRole(auth.user._id, auth.organizationId);
  if (!requireRole(role, minimumRole)) {
    return { ok: false, response: jsonError("Insufficient permissions", 403) };
  }

  return {
    ok: true,
    user: auth.user,
    organizationId: auth.organizationId,
    role: role!,
  };
}

export function toOrgSession(user: UserAttrs, organizationId: string, role: OrgRole): OrgSession {
  return { userId: user._id, organizationId, role };
}
