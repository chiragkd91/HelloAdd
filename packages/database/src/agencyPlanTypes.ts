import type { AgencyPlanBillingCycle, Platform } from "./enums";

export type { AgencyPlanBillingCycle, Platform } from "./enums";

/** Feature flags + monthly AI credits for an agency-defined client plan. */
export type AgencyPlanFeaturesAttrs = {
  postScheduling: boolean;
  adTracking: boolean;
  aiCredits: number;
  reviewManagement: boolean;
  leadCapture: boolean;
  whatsappAlerts: boolean;
  whatsappScheduling: boolean;
  unifiedInbox: boolean;
  advancedReports: boolean;
  bulkScheduling: boolean;
};

export type AgencyPlanLimitsAttrs = {
  /** Use -1 for unlimited. */
  socialAccounts: number;
  campaigns: number;
  teamMembers: number;
  scheduledPostsPerMonth: number;
};

export type AgencyPlanAttrs = {
  _id: string;
  agencyOrgId: string;
  planName: string;
  description: string;
  allowedPlatforms: Platform[];
  features: AgencyPlanFeaturesAttrs;
  monthlyPrice: number;
  currency: string;
  billingCycle: AgencyPlanBillingCycle;
  limits: AgencyPlanLimitsAttrs;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
