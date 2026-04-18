import { Organization, OrganizationInvite, connectMongo } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { hashInviteToken } from "@/lib/organization/inviteToken";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const a = local.slice(0, 2);
  return `${a}•••@${domain}`;
}

/** Public: validate token and return safe metadata for the accept-invite screen. */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token || token.length < 32) {
    return jsonError("Invalid token", 400);
  }

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const tokenHash = hashInviteToken(token);
  const inv = await OrganizationInvite.findOne({ tokenHash }).lean();
  if (!inv) {
    return jsonOk({ valid: false as const, reason: "not_found" });
  }
  if (inv.acceptedAt) {
    return jsonOk({ valid: false as const, reason: "already_used" });
  }
  if (inv.expiresAt.getTime() < Date.now()) {
    return jsonOk({ valid: false as const, reason: "expired" });
  }

  const org = await Organization.findById(inv.organizationId).lean();
  return jsonOk({
    valid: true as const,
    organizationName: org?.name ?? "Workspace",
    role: inv.role,
    emailHint: maskEmail(inv.email),
  });
}
