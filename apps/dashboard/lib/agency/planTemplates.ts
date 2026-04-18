import type { AgencyPlanAttrs } from "@helloadd/database/agency-plan-types";

type Template = Omit<
  AgencyPlanAttrs,
  "_id" | "agencyOrgId" | "createdAt" | "updatedAt" | "isActive"
>;

export const AGENCY_PLAN_TEMPLATES: { label: string; plan: Template }[] = [
  {
    label: "Social Starter — ₹4,999/mo",
    plan: {
      planName: "Social Starter",
      description: "Instagram, Facebook, WhatsApp — scheduling + alerts.",
      allowedPlatforms: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
      features: {
        postScheduling: true,
        adTracking: false,
        aiCredits: 500,
        reviewManagement: false,
        leadCapture: false,
        whatsappAlerts: true,
        whatsappScheduling: false,
        unifiedInbox: false,
        advancedReports: false,
        bulkScheduling: false,
      },
      monthlyPrice: 4999,
      currency: "INR",
      billingCycle: "MONTHLY",
      limits: {
        socialAccounts: 10,
        campaigns: 10,
        teamMembers: 2,
        scheduledPostsPerMonth: 500,
      },
    },
  },
  {
    label: "Ad Pro — ₹9,999/mo",
    plan: {
      planName: "Ad Pro",
      description: "Paid + organic across Meta, Google, WhatsApp.",
      allowedPlatforms: ["FACEBOOK", "INSTAGRAM", "GOOGLE", "WHATSAPP"],
      features: {
        postScheduling: true,
        adTracking: true,
        aiCredits: 1000,
        reviewManagement: false,
        leadCapture: true,
        whatsappAlerts: true,
        whatsappScheduling: false,
        unifiedInbox: false,
        advancedReports: false,
        bulkScheduling: false,
      },
      monthlyPrice: 9999,
      currency: "INR",
      billingCycle: "MONTHLY",
      limits: {
        socialAccounts: 20,
        campaigns: 25,
        teamMembers: 5,
        scheduledPostsPerMonth: 2000,
      },
    },
  },
  {
    label: "Full Stack — ₹19,999/mo",
    plan: {
      planName: "Full Stack",
      description: "All platforms, all features, high limits.",
      allowedPlatforms: ["FACEBOOK", "INSTAGRAM", "GOOGLE", "LINKEDIN", "YOUTUBE", "WHATSAPP", "TWITTER"],
      features: {
        postScheduling: true,
        adTracking: true,
        aiCredits: 2000,
        reviewManagement: true,
        leadCapture: true,
        whatsappAlerts: true,
        whatsappScheduling: true,
        unifiedInbox: true,
        advancedReports: true,
        bulkScheduling: true,
      },
      monthlyPrice: 19999,
      currency: "INR",
      billingCycle: "MONTHLY",
      limits: {
        socialAccounts: -1,
        campaigns: -1,
        teamMembers: -1,
        scheduledPostsPerMonth: -1,
      },
    },
  },
];
