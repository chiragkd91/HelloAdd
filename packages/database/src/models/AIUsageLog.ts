import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";

export type AIUsageFeature =
  | "budget_optimizer"
  | "campaign_analyzer"
  | "report_summarizer"
  | "chat_assistant"
  | "error_explainer"
  | "agency_digest"
  | "image_generation"
  | "content_writer";

export type AIUsageLogAttrs = {
  _id: string;
  organizationId: string;
  feature: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  createdAt: Date;
};

const aiUsageLogSchema = new Schema<AIUsageLogAttrs>(
  {
    _id: { type: String, default: () => createId() },
    organizationId: { type: String, required: true, ref: "Organization" },
    feature: { type: String, required: true },
    inputTokens: { type: Number, required: true },
    outputTokens: { type: Number, required: true },
    totalTokens: { type: Number, required: true },
    estimatedCostUSD: { type: Number, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

aiUsageLogSchema.index({ organizationId: 1, createdAt: -1 });
aiUsageLogSchema.index({ createdAt: -1 });

export const AIUsageLog: Model<AIUsageLogAttrs> =
  models?.AIUsageLog ?? model<AIUsageLogAttrs>("AIUsageLog", aiUsageLogSchema, "ai_usage_logs");
