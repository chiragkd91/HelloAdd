import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";
import {
  AgencyPlanBillingCycleValues,
  PlatformValues,
} from "../enums";
import type {
  AgencyPlanAttrs,
  AgencyPlanFeaturesAttrs,
  AgencyPlanLimitsAttrs,
} from "../agencyPlanTypes";

export type {
  AgencyPlanAttrs,
  AgencyPlanFeaturesAttrs,
  AgencyPlanLimitsAttrs,
} from "../agencyPlanTypes";

export const agencyPlanFeaturesSchema = new Schema<AgencyPlanFeaturesAttrs>(
  {
    postScheduling: { type: Boolean, default: false },
    adTracking: { type: Boolean, default: false },
    aiCredits: { type: Number, default: 0 },
    reviewManagement: { type: Boolean, default: false },
    leadCapture: { type: Boolean, default: false },
    whatsappAlerts: { type: Boolean, default: false },
    whatsappScheduling: { type: Boolean, default: false },
    unifiedInbox: { type: Boolean, default: false },
    advancedReports: { type: Boolean, default: false },
    bulkScheduling: { type: Boolean, default: false },
  },
  { _id: false },
);

const planLimitsSchema = new Schema<AgencyPlanLimitsAttrs>(
  {
    socialAccounts: { type: Number, default: 5 },
    campaigns: { type: Number, default: 10 },
    teamMembers: { type: Number, default: 2 },
    scheduledPostsPerMonth: { type: Number, default: 100 },
  },
  { _id: false },
);

const agencyPlanSchema = new Schema<AgencyPlanAttrs>(
  {
    _id: { type: String, default: () => createId() },
    agencyOrgId: { type: String, required: true, ref: "Organization", index: true },
    planName: { type: String, required: true },
    description: { type: String, default: "" },
    allowedPlatforms: [{ type: String, enum: PlatformValues }],
    features: { type: agencyPlanFeaturesSchema, default: () => ({}) },
    monthlyPrice: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    billingCycle: {
      type: String,
      enum: AgencyPlanBillingCycleValues,
      default: "MONTHLY",
    },
    limits: { type: planLimitsSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

agencyPlanSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

agencyPlanSchema.index({ agencyOrgId: 1, isActive: 1 });

export const AgencyPlan: Model<AgencyPlanAttrs> =
  models?.AgencyPlan ?? model<AgencyPlanAttrs>("AgencyPlan", agencyPlanSchema, "agency_plans");
