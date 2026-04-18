import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";
import { OrgRoleValues, type OrgRole } from "../enums";

export type OrganizationMemberAttrs = {
  _id: string;
  userId: string;
  organizationId: string;
  role: OrgRole;
};

const organizationMemberSchema = new Schema<OrganizationMemberAttrs>(
  {
    _id: { type: String, default: () => createId() },
    userId: { type: String, required: true, ref: "User" },
    organizationId: { type: String, required: true, ref: "Organization" },
    role: { type: String, enum: OrgRoleValues, default: "VIEWER" },
  },
  { timestamps: false },
);

organizationMemberSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

export const OrganizationMember: Model<OrganizationMemberAttrs> =
  models?.OrganizationMember ??
  model<OrganizationMemberAttrs>("OrganizationMember", organizationMemberSchema, "organization_members");
