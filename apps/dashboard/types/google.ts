/** Google Ads API — normalized types (REST v17). Task 2.2 */

export interface GoogleCustomer {
  /** Numeric customer id (no dashes), e.g. "1234567890" */
  id: string;
  resourceName: string;
}

export interface GoogleCampaign {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface GoogleMetrics {
  impressions: number;
  clicks: number;
  /** Sum of `metrics.cost_micros` from API; divide by 1_000_000 for currency units */
  costMicros: number;
  ctr: number;
  conversions: number;
  /** CPC in micros (optional; when present from API) */
  averageCpcMicros?: number;
}
