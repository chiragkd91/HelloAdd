/** Legacy minimal shape — prefer `ApiCampaign` for API-backed data. */
export type CampaignStatus = "active" | "paused" | "ended";

export type Campaign = {
  id: string;
  name: string;
  platform: string;
  status: CampaignStatus;
  spend: number;
  impressions: number;
  ctr: number;
};

/** Response item from `GET /api/campaigns` (matches `serializeCampaign`). */
export type ApiCampaign = {
  id: string;
  organizationId: string;
  integrationId: string;
  externalId: string;
  name: string;
  platform: string;
  product: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  budgetTotal: number;
  budgetSpent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  region: string | null;
  errorType: string;
  errorMessage: string | null;
  lastSyncedAt: string | null;
};
