import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";

/** Curated or ingested market / platform trend items for “Market pulse” suggestions. */
export type MarketTrendAttrs = {
  _id: string;
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  /** e.g. FACEBOOK, GOOGLE — empty = all */
  platforms: string[];
  industries: string[];
  /** 1–100 for ranking in UI */
  relevanceScore: number;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const marketTrendSchema = new Schema<MarketTrendAttrs>(
  {
    _id: { type: String, default: () => createId() },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    url: { type: String, required: true },
    sourceName: { type: String, required: true },
    platforms: { type: [String], default: [] },
    industries: { type: [String], default: [] },
    relevanceScore: { type: Number, default: 50, min: 1, max: 100 },
    publishedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

marketTrendSchema.index({ publishedAt: -1 });
marketTrendSchema.index({ platforms: 1, publishedAt: -1 });

export const MarketTrend: Model<MarketTrendAttrs> =
  models?.MarketTrend ?? model<MarketTrendAttrs>("MarketTrend", marketTrendSchema, "market_trends");
