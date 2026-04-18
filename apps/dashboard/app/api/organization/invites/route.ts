import {
  InviteRoleValues,
  Organization,
  OrganizationInvite,
  OrganizationMember,
  User,
  connectMongo,
} from "@helloadd/database";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { enforceAgencyTeamInviteLimit } from "@/lib/agency/agencyPlanEnforcement";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";
import { sendInviteEmail } from "@/lib/email/sendInviteEmail";
import { generateInviteSecret, hashInviteToken } from "@/lib/organization/inviteToken";

function inviteRoleLabel(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "MANAGER":
      return "Manager";
    case "VIEWER":
      return "Viewer";
    default:
      return role;
  }
}

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(InviteRoleValues as unknown as [string, ...string[]]),
});

function dashboardOrigin(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3001";
}

/** List pending invites for the workspace. */
export async function GET(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "ADMIN");
  if (!auth.ok) return auth.response;

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const rows = await OrganizationInvite.find({
    organizationId: auth.organizationId,
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  return jsonOk({
    invites: rows.map((r) => ({
      id: r._id,
      email: r.email,
      role: r.role,
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

/** Create an invite and return a one-time link (token shown once). */
export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "ADMIN");
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const emailNorm = parsed.data.email.toLowerCase().trim();

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const agencyTeam = await enforceAgencyTeamInviteLimit(auth.organizationId);
  if (agencyTeam) return agencyTeam;

  const existingUser = await User.findOne({ email: emailNorm }).lean();
  if (existingUser) {
    const already = await OrganizationMember.findOne({
      organizationId: auth.organizationId,
      userId: existingUser._id,
    }).lean();
    if (already) {
      return jsonError("This person is already a member of the workspace", 409);
    }
  }

  await OrganizationInvite.deleteMany({
    organizationId: auth.organizationId,
    email: emailNorm,
    acceptedAt: null,
  });

  const rawToken = generateInviteSecret();
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  await OrganizationInvite.create({
    organizationId: auth.organizationId,
    email: emailNorm,
    role: parsed.data.role,
    tokenHash,
    invitedByUserId: auth.user._id,
    expiresAt,
    acceptedAt: null,
    createdAt: new Date(),
  });

  const origin = dashboardOrigin(req);
  const acceptPath = `/accept-invite?token=${encodeURIComponent(rawToken)}`;
  const inviteUrl = `${origin}${acceptPath}`;

  const org = await Organization.findById(auth.organizationId).lean();
  const orgName = org?.name ?? "your workspace";
  const inviterName =
    [auth.user.name, auth.user.email].find((x) => typeof x === "string" && x.trim())?.trim() ?? "A teammate";

  let emailSent = false;
  try {
    emailSent = await sendInviteEmail(
      emailNorm,
      inviteUrl,
      orgName,
      inviterName,
      inviteRoleLabel(parsed.data.role),
    );
  } catch (e) {
    console.error("[invites] sendInviteEmail failed:", e);
    emailSent = false;
  }

  return jsonOk({
    inviteUrl,
    expiresAt: expiresAt.toISOString(),
    emailSent,
  });
}

/** Revoke a pending invite by id */
export async function DELETE(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "ADMIN");
  if (!auth.ok) return auth.response;

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return jsonError("Missing id", 400);
  }

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const r = await OrganizationInvite.deleteOne({
    _id: id,
    organizationId: auth.organizationId,
    acceptedAt: null,
  });

  if (r.deletedCount === 0) {
    return jsonError("Invite not found or already accepted", 404);
  }

  return jsonOk({ ok: true });
}
