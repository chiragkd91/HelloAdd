/** Meta Marketing API — Graph responses (string numbers are normal). */

export interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  /** Present when returned by Graph `spend_cap` field */
  spend_cap?: string;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  objective?: string;
}

export interface MetaInsights {
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
  cpc: string;
  reach?: string;
  actions?: Array<{ action_type: string; value: string }>;
}
