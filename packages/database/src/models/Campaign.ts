import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";
import {
  AdStatusValues,
  ErrorTypeValues,
  PlatformValues,
  type AdStatus,
  type ErrorType,
  type Platform,
} from "../enums";

export type CampaignAttrs = {
  _id: string;
  organizationId: string;
  integrationId: string;
  externalId: string;
  name: string;
  platform: Platform;
  product?: string | null;
  status: AdStatus;
  startDate: Date;
  endDate?: Date | null;
  budgetTotal: number;
  budgetSpent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  region?: string | null;
  /** UTM source for attribution (optional; used by error detection). */
  utmSource?: string | null;
  errorType: ErrorType;
  errorMessage?: string | null;
  lastSyncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const campaignSchema = new Schema<CampaignAttrs>(
  {
    _id: { type: String, default: () => createId() },
    organizationId: { type: String, required: true, ref: "Organization" },
    integrationId: { type: String, required: true, ref: "Integration" },
    externalId: { type: String, required: true },
    name: { type: String, required: true },
    platform: { type: String, enum: PlatformValues, required: true },
    product: { type: String, default: null },
    status: { type: String, enum: AdStatusValues, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    budgetTotal: { type: Number, required: true },
    budgetSpent: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    region: { type: String, default: null },
    utmSource: { type: String, default: null },
    errorType: { type: String, enum: ErrorTypeValues, default: "NONE" },
    errorMessage: { type: String, default: null },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

campaignSchema.index({ organizationId: 1 });
campaignSchema.index({ integrationId: 1 });

export const Campaign: Model<CampaignAttrs> =
  models?.Campaign ?? model<CampaignAttrs>("Campaign", campaignSchema, "campaigns");
