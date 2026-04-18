import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";
import { OrgRoleValues, type OrgRole } from "../enums";

/** Roles that can be assigned via invite (never OWNER — transfer is a separate flow). */
export const InviteRoleValues = ["ADMIN", "MANAGER", "VIEWER"] as const;
export type InviteRole = (typeof InviteRoleValues)[number];

export type OrganizationInviteAttrs = {
  _id: string;
  organizationId: string;
  /** Lowercased email the invite is tied to */
  email: string;
  role: OrgRole;
  /** sha256 hex of the raw token (never store raw token) */
  tokenHash: string;
  invitedByUserId: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
};

const organizationInviteSchema = new Schema<OrganizationInviteAttrs>(
  {
    _id: { type: String, default: () => createId() },
    organizationId: { type: String, required: true, ref: "Organization" },
    email: { type: String, required: true },
    role: { type: String, enum: OrgRoleValues, required: true },
    tokenHash: { type: String, required: true },
    invitedByUserId: { type: String, required: true, ref: "User" },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    createdAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

organizationInviteSchema.index({ tokenHash: 1 }, { unique: true });
organizationInviteSchema.index({ organizationId: 1, email: 1 });
organizationInviteSchema.index({ organizationId: 1, acceptedAt: 1 });

export const OrganizationInvite: Model<OrganizationInviteAttrs> =
  models?.OrganizationInvite ??
  model<OrganizationInviteAttrs>(
    "OrganizationInvite",
    organizationInviteSchema,
    "organization_invites",
  );
