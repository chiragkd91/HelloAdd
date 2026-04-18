/**
 * Shared platform API surface types (Task Group 2 — Meta, Google, LinkedIn).
 * Meta types are defined in `./meta` and re-exported here for a single import path.
 */
export type { MetaAdAccount, MetaCampaign, MetaInsights } from "./meta";

/** Google Ads API v17 — OAuth + search (Task 2.2). */
export type { GoogleCampaign, GoogleCustomer, GoogleMetrics } from "./google";
