import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";

export type CampaignMetricAttrs = {
  _id: string;
  campaignId: string;
  date: Date;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
};

const campaignMetricSchema = new Schema<CampaignMetricAttrs>(
  {
    _id: { type: String, default: () => createId() },
    campaignId: { type: String, required: true, ref: "Campaign" },
    date: { type: Date, required: true },
    impressions: { type: Number, required: true },
    clicks: { type: Number, required: true },
    spend: { type: Number, required: true },
    conversions: { type: Number, required: true },
    ctr: { type: Number, required: true },
  },
  { timestamps: false },
);

campaignMetricSchema.index({ campaignId: 1, date: 1 }, { unique: true });

export const CampaignMetric: Model<CampaignMetricAttrs> =
  models?.CampaignMetric ??
  model<CampaignMetricAttrs>("CampaignMetric", campaignMetricSchema, "campaign_metrics");
