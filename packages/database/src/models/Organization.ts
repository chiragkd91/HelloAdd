import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";
import { PlanValues, PlatformValues, type Plan, type Platform } from "../enums";
import { agencyPlanFeaturesSchema, type AgencyPlanFeaturesAttrs } from "./AgencyPlan";

/** White-label client portal (agency workspaces). */
export type ClientPortalBrandingAttrs = {
  logoUrl?: string | null;
  primaryColor?: string | null;
  /** light (default), dark, or custom palette */
  colorScheme?: "LIGHT" | "DARK" | "CUSTOM" | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  displayName?: string | null;
  showOverview?: boolean;
  showCampaigns?: boolean;
  showReports?: boolean;
};

export type OrganizationSettingsAttrs = {
  weeklyReportEnabled: boolean;
  monthlyReportEnabled: boolean;
  timezone?: string | null;
  currency?: string | null;
  reportEmail?: string | null;
  alertEmail?: string | null;
  whatsappNumber?: string | null;
  clientPortalBranding?: ClientPortalBrandingAttrs | null;
};

export type BillingInvoiceAttrs = {
  billedAt: Date;
  amountInr: number;
  plan: string;
  status: string;
};

export type OrganizationAttrs = {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  plan: Plan;
  settings?: OrganizationSettingsAttrs;
  /** When false, new users must complete the onboarding wizard. Omitted = legacy orgs (treated as done). */
  onboardingComplete?: boolean;
  /** Trial end time when plan is TRIAL. */
  trialEndsAt?: Date | null;
  razorpaySubscriptionId?: string | null;
  nextBillingDate?: Date | null;
  billingInvoices?: BillingInvoiceAttrs[];
  /** Agency workspace flag (future: links to managed client orgs). */
  isAgency?: boolean;
  /** Parent agency org when this org is a managed client (cuid). */
  parentAgencyId?: string | null;
  /** Denormalized count of linked clients (agency orgs). */
  clientCount?: number;
  industry?: string | null;
  /** Rule-based or refreshed “AI health” score (0–100). */
  aiHealthScore?: number | null;
  aiHealthLabel?: "HEALTHY" | "WARNING" | "CRITICAL" | null;
  /** Agency custom plan assigned to this client org (snapshot; SaaS `plan` stays TRIAL/STARTER/etc.). */
  assignedPlanId?: string | null;
  /** Platforms this client may use (from assigned agency plan). */
  allowedPlatforms?: Platform[];
  /** Feature flags + AI credits snapshot from assigned plan. */
  planFeatures?: AgencyPlanFeaturesAttrs | null;
  createdAt: Date;
};

const clientPortalBrandingSchema = new Schema<ClientPortalBrandingAttrs>(
  {
    logoUrl: { type: String, default: null },
    primaryColor: { type: String, default: null },
    colorScheme: { type: String, default: "LIGHT" },
    backgroundColor: { type: String, default: null },
    textColor: { type: String, default: null },
    displayName: { type: String, default: null },
    showOverview: { type: Boolean, default: true },
    showCampaigns: { type: Boolean, default: true },
    showReports: { type: Boolean, default: true },
  },
  { _id: false },
);

const organizationSettingsSchema = new Schema<OrganizationSettingsAttrs>(
  {
    weeklyReportEnabled: { type: Boolean, default: true },
    monthlyReportEnabled: { type: Boolean, default: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    currency: { type: String, default: "INR" },
    reportEmail: { type: String, default: null },
    alertEmail: { type: String, default: null },
    whatsappNumber: { type: String, default: null },
    clientPortalBranding: { type: clientPortalBrandingSchema, default: null },
  },
  { _id: false }
);

const billingInvoiceSchema = new Schema<BillingInvoiceAttrs>(
  {
    billedAt: { type: Date, required: true },
    amountInr: { type: Number, required: true },
    plan: { type: String, required: true },
    status: { type: String, required: true },
  },
  { _id: false },
);

const organizationSchema = new Schema<OrganizationAttrs>(
  {
    _id: { type: String, default: () => createId() },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    logoUrl: { type: String, default: null },
    plan: { type: String, enum: PlanValues, default: "STARTER" },
    settings: { type: organizationSettingsSchema, default: () => ({}) },
    onboardingComplete: { type: Boolean },
    trialEndsAt: { type: Date, default: null },
    razorpaySubscriptionId: { type: String, default: null },
    nextBillingDate: { type: Date, default: null },
    billingInvoices: { type: [billingInvoiceSchema], default: [] },
    isAgency: { type: Boolean, default: false },
    parentAgencyId: { type: String, default: null, ref: "Organization", index: true },
    clientCount: { type: Number, default: 0 },
    industry: { type: String, default: null },
    aiHealthScore: { type: Number, default: null },
    aiHealthLabel: { type: String, default: null },
    assignedPlanId: { type: String, default: null, ref: "AgencyPlan", index: true },
    allowedPlatforms: [{ type: String, enum: PlatformValues }],
    planFeatures: { type: agencyPlanFeaturesSchema, default: null },
    createdAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

/** Single unique index on slug (avoid duplicate index from field-level `unique`) */
organizationSchema.index({ slug: 1 }, { unique: true });

export const Organization: Model<OrganizationAttrs> =
  models?.Organization ?? model<OrganizationAttrs>("Organization", organizationSchema, "organizations");
