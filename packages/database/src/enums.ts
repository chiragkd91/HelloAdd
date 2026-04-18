/** Mirrors Part 2 schema — stored as strings in MongoDB. */

export const RoleValues = ["SUPER_ADMIN", "ADMIN", "MEMBER"] as const;
export type Role = (typeof RoleValues)[number];

export const AuthProviderValues = ["email", "google"] as const;
export type AuthProvider = (typeof AuthProviderValues)[number];

export const OrgRoleValues = ["OWNER", "ADMIN", "MANAGER", "VIEWER"] as const;
export type OrgRole = (typeof OrgRoleValues)[number];

export const PlanValues = ["TRIAL", "STARTER", "GROWTH", "AGENCY"] as const;
export type Plan = (typeof PlanValues)[number];

export const PlatformValues = [
  "FACEBOOK",
  "INSTAGRAM",
  "GOOGLE",
  "LINKEDIN",
  "YOUTUBE",
  "TWITTER",
  /** WhatsApp Business Cloud API (alerts / messaging — not ad campaign sync). */
  "WHATSAPP",
] as const;
export type Platform = (typeof PlatformValues)[number];

export const AdStatusValues = ["LIVE", "PAUSED", "ENDED", "DRAFT", "REJECTED"] as const;
export type AdStatus = (typeof AdStatusValues)[number];

export const ErrorTypeValues = [
  "NONE",
  "OVERSPEND",
  "DEAD_CAMPAIGN",
  "CREATIVE_REJECTED",
  "AUDIENCE_OVERLAP",
  "LOW_CTR",
  "MISSING_UTM",
  "EXPIRING_SOON",
] as const;
export type ErrorType = (typeof ErrorTypeValues)[number];

export const AlertTypeValues = [
  "BUDGET_WARNING",
  "CAMPAIGN_ERROR",
  "CTR_DROP",
  "CREATIVE_REJECTED",
  "CAMPAIGN_EXPIRING",
  "OVERSPEND",
] as const;
export type AlertType = (typeof AlertTypeValues)[number];

export const SeverityValues = ["INFO", "WARNING", "CRITICAL"] as const;
export type Severity = (typeof SeverityValues)[number];

export const AgencyClientStatusValues = ["ACTIVE", "PAUSED", "ENDED"] as const;
export type AgencyClientStatus = (typeof AgencyClientStatusValues)[number];

export const AgencyPlanBillingCycleValues = ["MONTHLY", "QUARTERLY", "ANNUALLY"] as const;
export type AgencyPlanBillingCycle = (typeof AgencyPlanBillingCycleValues)[number];

/** Client onboarding: integration row before OAuth/manual verification. */
export const AgencyIntegrationHintStateValues = ["SKIPPED", "PENDING_MANUAL"] as const;
export type AgencyIntegrationHintState = (typeof AgencyIntegrationHintStateValues)[number];

export const AgencyInvoiceStatusValues = ["DRAFT", "SENT", "PAID", "OVERDUE"] as const;
export type AgencyInvoiceStatus = (typeof AgencyInvoiceStatusValues)[number];
