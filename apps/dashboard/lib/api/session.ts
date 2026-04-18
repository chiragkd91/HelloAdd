import type { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import {
  connectMongo,
  Organization,
  OrganizationMember,
  Session,
  User,
  type UserAttrs,
} from "@helloadd/database";

const SESSION_DAYS = 30;

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function sessionExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d;
}

export async function resolveRequestUser(req: NextRequest): Promise<{
  user: UserAttrs | null;
  sessionToken: string | null;
  organizationId: string | null;
}> {
  await connectMongo();
  const auth = req.headers.get("authorization");
  const fromBearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const fromCookie = req.cookies.get("session")?.value ?? null;
  const token = fromBearer || fromCookie;
  if (!token) {
    return { user: null, sessionToken: null, organizationId: null };
  }

  const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } }).lean();
  if (!session) {
    return { user: null, sessionToken: null, organizationId: null };
  }

  const userDoc = await User.findById(session.userId).lean();
  if (!userDoc) {
    return { user: null, sessionToken: null, organizationId: null };
  }

  const orgHeader = req.headers.get("x-organization-id");
  let organizationId: string | null = orgHeader;
  if (!organizationId) {
    const m = await OrganizationMember.findOne({ userId: userDoc._id }).lean();
    organizationId = m?.organizationId ?? null;
  }

  return { user: userDoc as UserAttrs, sessionToken: token, organizationId };
}

export function publicUser(u: UserAttrs) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl ?? null,
    emailVerified: u.emailVerified !== false,
  };
}

export async function listUserOrganizations(userId: string) {
  const members = await OrganizationMember.find({ userId }).lean();
  const orgs = await Organization.find({
    _id: { $in: members.map((m) => m.organizationId) },
  }).lean();
  return members.map((m) => {
    const o = orgs.find((x) => x._id === m.organizationId);
    return {
      organizationId: m.organizationId,
      role: m.role,
      name: o?.name ?? "",
      slug: o?.slug ?? "",
      plan: o?.plan ?? "STARTER",
      onboardingComplete: o?.onboardingComplete !== false,
      trialEndsAt: o?.trialEndsAt ? o.trialEndsAt.toISOString() : null,
    };
  });
}
