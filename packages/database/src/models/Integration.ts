import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";
import { PlatformValues, type Platform } from "../enums";

export type IntegrationAttrs = {
  _id: string;
  organizationId: string;
  platform: Platform;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  accountId: string;
  accountName: string;
  metadata?: Record<string, unknown> | null;
  isActive: boolean;
  connectedAt: Date;
  lastSyncedAt?: Date | null;
};

const integrationSchema = new Schema<IntegrationAttrs>(
  {
    _id: { type: String, default: () => createId() },
    organizationId: { type: String, required: true, ref: "Organization" },
    platform: { type: String, enum: PlatformValues, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, default: null },
    tokenExpiresAt: { type: Date, default: null },
    accountId: { type: String, required: true },
    accountName: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: null },
    isActive: { type: Boolean, default: true },
    connectedAt: { type: Date, default: () => new Date() },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: false },
);

integrationSchema.index({ organizationId: 1 });

export const Integration: Model<IntegrationAttrs> =
  models?.Integration ?? model<IntegrationAttrs>("Integration", integrationSchema, "integrations");
