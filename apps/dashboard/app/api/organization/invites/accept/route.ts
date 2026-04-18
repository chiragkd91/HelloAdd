import {
  OrganizationInvite,
  OrganizationMember,
  connectMongo,
} from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { enforceAgencyTeamMemberAcceptLimit } from "@/lib/agency/agencyPlanEnforcement";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";
import { hashInviteToken } from "@/lib/organization/inviteToken";

const bodySchema = z.object({
  token: z.string().min(32),
});

/** Authenticated user accepts an invite (email must match the invite). */
export async function POST(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const emailNorm = auth.user.email.toLowerCase().trim();

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const tokenHash = hashInviteToken(parsed.data.token);
  const inv = await OrganizationInvite.findOne({ tokenHash }).lean();
  if (!inv) {
    return jsonError("Invalid or expired invite", 404);
  }
  if (inv.acceptedAt) {
    return jsonError("This invite was already accepted", 410);
  }
  if (inv.expiresAt.getTime() < Date.now()) {
    return jsonError("This invite has expired", 410);
  }
  if (inv.email !== emailNorm) {
    return jsonError(
      "Signed-in email does not match the invite. Sign in with the invited address or ask for a new invite.",
      403,
    );
  }

  const existing = await OrganizationMember.findOne({
    organizationId: inv.organizationId,
    userId: auth.user._id,
  }).lean();
  if (existing) {
    await OrganizationInvite.updateOne(
      { _id: inv._id },
      { $set: { acceptedAt: new Date() } },
    );
    return jsonOk({ ok: true, alreadyMember: true, organizationId: inv.organizationId });
  }

  const agencySeat = await enforceAgencyTeamMemberAcceptLimit(inv.organizationId);
  if (agencySeat) return agencySeat;

  await OrganizationMember.create({
    userId: auth.user._id,
    organizationId: inv.organizationId,
    role: inv.role,
  });

  await OrganizationInvite.updateOne({ _id: inv._id }, { $set: { acceptedAt: new Date() } });

  return jsonOk({ ok: true, alreadyMember: false, organizationId: inv.organizationId });
}
