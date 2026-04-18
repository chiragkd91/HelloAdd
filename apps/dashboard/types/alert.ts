/** Item from `GET /api/alerts` (enriched). */
export type ApiAlertItem = {
  id: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  severity: string;
  campaignId: string | null;
  createdAt: string;
  campaignName: string | null;
  platform: string | null;
  aiExplanation?: string | null;
  aiFixSteps?: string[] | null;
};
