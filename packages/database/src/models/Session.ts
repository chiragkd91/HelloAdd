import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";

export type SessionAttrs = {
  _id: string;
  userId: string;
  token: string;
  expiresAt: Date;
};

const sessionSchema = new Schema<SessionAttrs>(
  {
    _id: { type: String, default: () => createId() },
    userId: { type: String, required: true, ref: "User" },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false },
);

/** Single unique index on token (avoid duplicate index from field-level `unique`) */
sessionSchema.index({ token: 1 }, { unique: true });
sessionSchema.index({ userId: 1 });

export const Session: Model<SessionAttrs> =
  models?.Session ?? model<SessionAttrs>("Session", sessionSchema, "sessions");
