import { cookies } from "next/headers";
import {
  Organization,
  OrganizationMember,
  Session,
  connectMongo,
} from "@helloadd/database";

export type SessionOrgContext = {
  organizationId: string;
  /** Only `false` means the onboarding wizard is required; `undefined` = legacy org (skip). */
  onboardingComplete?: boolean;
  plan: string;
  trialEndsAt: Date | null;
};

export async function getSessionOrgContext(): Promise<SessionOrgContext | null> {
  try {
    await connectMongo();
  } catch {
    return null;
  }

  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;

  const member = await OrganizationMember.findOne({ userId: session.userId }).lean();
  if (!member) return null;

  const org = await Organization.findById(member.organizationId).lean();
  if (!org) return null;

  return {
    organizationId: org._id,
    onboardingComplete: org.onboardingComplete,
    plan: org.plan,
    trialEndsAt: org.trialEndsAt ?? null,
  };
}
