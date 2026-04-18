import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";
import { AuthProviderValues, RoleValues, type AuthProvider, type Role } from "../enums";

export type UserAttrs = {
  _id: string;
  name: string;
  email: string;
  password?: string | null;
  authProvider: AuthProvider;
  role: Role;
  avatarUrl?: string | null;
  /** `false` = must verify email (password sign-up). `true` / omitted = can sign in (legacy + OAuth + invite). */
  emailVerified?: boolean;
  emailVerificationTokenHash?: string | null;
  emailVerificationExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserAttrs>(
  {
    _id: { type: String, default: () => createId() },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    authProvider: { type: String, enum: AuthProviderValues, default: "email" },
    role: { type: String, enum: RoleValues, default: "MEMBER" },
    avatarUrl: { type: String, default: null },
    emailVerified: { type: Boolean },
    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
  },
  { timestamps: true },
);

export const User: Model<UserAttrs> = models?.User ?? model<UserAttrs>("User", userSchema, "users");
