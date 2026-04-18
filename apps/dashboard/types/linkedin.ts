/** LinkedIn Marketing API — normalized types. */

export interface LinkedInAdAccount {
  id: string;
  name?: string;
  /** Raw URN if returned */
  urn?: string;
}

export interface LinkedInCampaign {
  id: number;
  name: string;
  status: string;
  totalBudget?: { amount: string; currencyCode: string };
  runSchedule?: unknown;
}

export interface LinkedInMetrics {
  impressions: number;
  clicks: number;
  costInLocalCurrency: number;
  clickThroughRate: number;
  leads?: number;
}
