import { randomBytes } from "crypto";
import { createId } from "@paralleldrive/cuid2";
import {
  Organization,
  OrganizationInvite,
  OrganizationMember,
  PlanValues,
  Session,
  User,
  connectMongo,
} from "@helloadd/database";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyMarketingCors } from "@/lib/api/cors";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { createSessionToken, publicUser, sessionExpiresAt } from "@/lib/api/session";
import { dashboardPublicBaseUrl } from "@/lib/auth/dashboardBaseUrl";
import { sendVerificationEmail } from "@/lib/email/sendVerificationEmail";
import { hashInviteToken } from "@/lib/organization/inviteToken";

const planEnum = z.enum(PlanValues as unknown as [string, ...string[]]);

const bodySchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    companyName: z.string().min(1).optional(),
    plan: planEnum.optional(),
    /** 64-char hex token from an invite link */
    inviteToken: z.string().length(64).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.inviteToken && !data.companyName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company name is required",
        path: ["companyName"],
      });
    }
  });

function slugifyBase(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function OPTIONS(req: NextRequest) {
  return applyMarketingCors(req, new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const cors = (res: NextResponse) => applyMarketingCors(req, res);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return cors(jsonError("Invalid JSON body", 400));
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return cors(jsonError("Validation failed", 400, parsed.error.flatten()));
  }

  const { name, email, password, companyName, plan: _marketingPlan, inviteToken } = parsed.data;
  void _marketingPlan;
  const emailNorm = email.toLowerCase().trim();

  try {
    await connectMongo();
  } catch (e) {
    return cors(jsonDbUnavailable(e));
  }

  if (inviteToken) {
    const tokenHash = hashInviteToken(inviteToken);
    const invite = await OrganizationInvite.findOne({ tokenHash }).lean();
    if (!invite || invite.acceptedAt || invite.expiresAt.getTime() < Date.now()) {
      return cors(jsonError("Invalid or expired invite", 400));
    }
    if (invite.email !== emailNorm) {
      return cors(jsonError("Email must match the invited address", 400));
    }

    const existingInv = await User.findOne({ email: emailNorm });
    if (existingInv) {
      return cors(
        jsonError(
          "An account with this email already exists. Sign in and open your invite link to join the workspace.",
          409,
        ),
      );
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: emailNorm,
      password: hash,
      emailVerified: true,
    });

    await OrganizationMember.create({
      userId: user._id,
      organizationId: invite.organizationId,
      role: invite.role,
    });

    await OrganizationInvite.updateOne({ _id: invite._id }, { $set: { acceptedAt: new Date() } });

    const org = await Organization.findById(invite.organizationId).lean();
    if (!org) {
      return cors(jsonError("Organization not found", 500));
    }

    const token = createSessionToken();
    await Session.create({
      userId: user._id,
      token,
      expiresAt: sessionExpiresAt(),
    });

    const res = jsonOk({
      user: publicUser(user),
      organization: { id: org._id, name: org.name, slug: org.slug, plan: org.plan },
      token,
      joinedViaInvite: true,
    });

    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });

    return cors(res);
  }

  const existing = await User.findOne({ email: emailNorm });
  if (existing) {
    return cors(jsonError("Email already registered", 409));
  }

  const hash = await bcrypt.hash(password, 10);
  const rawVerifyToken = randomBytes(32).toString("hex");
  const verifyHash = hashInviteToken(rawVerifyToken);
  const emailVerificationExpires = new Date();
  emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 48);

  const user = await User.create({
    name,
    email: emailNorm,
    password: hash,
    emailVerified: false,
    emailVerificationTokenHash: verifyHash,
    emailVerificationExpires,
  });

  const base = slugifyBase(companyName ?? name);
  const slug = `${base || "org"}-${createId().slice(0, 8)}`;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const org = await Organization.create({
    name: companyName ?? `${name}'s workspace`,
    slug,
    plan: "TRIAL",
    onboardingComplete: false,
    trialEndsAt,
  });

  await OrganizationMember.create({
    userId: user._id,
    organizationId: org._id,
    role: "OWNER",
  });

  const dashBase = dashboardPublicBaseUrl();
  const verifyUrl = `${dashBase}/api/auth/verify-email?token=${encodeURIComponent(rawVerifyToken)}`;
  const emailSent = await sendVerificationEmail(emailNorm, verifyUrl);

  if (!emailSent) {
    console.info(
      "[Hello Add] Verification link (set GMAIL_SMTP_USER + GMAIL_SMTP_APP_PASSWORD or RESEND_API_KEY to send email):",
      verifyUrl,
    );
    if (process.env.NODE_ENV === "production") {
      await OrganizationMember.deleteMany({ organizationId: org._id });
      await Organization.deleteOne({ _id: org._id });
      await User.deleteOne({ _id: user._id });
      return cors(jsonError("We could not send a verification email. Try again in a few minutes.", 503));
    }
  }

  return cors(
    jsonOk({
      requiresEmailVerification: true,
      email: emailNorm,
      user: publicUser(user),
      organization: { id: org._id, name: org.name, slug: org.slug, plan: org.plan },
    }),
  );
}
