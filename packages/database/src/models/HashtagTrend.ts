import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";

/**
 * Curated trending / high-use hashtags for marketing & social (India + global).
 * Replace with live API ingestion later if needed.
 */
export type HashtagTrendAttrs = {
  _id: string;
  /** Without leading # — UI adds # */
  tag: string;
  platforms: string[];
  /** 1–100 — higher = show first */
  heatScore: number;
  /** e.g. Hot, Rising, Steady */
  momentum: string;
  /** Short note for creatives */
  context: string;
  /** Category for filters */
  category?: string;
  /**
   * Same style as Market pulse / `market_trends.sourceName` (e.g. Google Ads, Meta Business).
   * Used to group and filter hashtags by editorial “market source”.
   */
  sourceName: string;
  updatedAt: Date;
  createdAt: Date;
};

const hashtagTrendSchema = new Schema<HashtagTrendAttrs>(
  {
    _id: { type: String, default: () => createId() },
    tag: { type: String, required: true },
    platforms: { type: [String], default: [] },
    heatScore: { type: Number, default: 50, min: 1, max: 100 },
    momentum: { type: String, default: "Rising" },
    context: { type: String, default: "" },
    category: { type: String, default: "" },
    sourceName: { type: String, default: "Industry note" },
  },
  { timestamps: true }
);

hashtagTrendSchema.index({ heatScore: -1, updatedAt: -1 });
hashtagTrendSchema.index({ platforms: 1, heatScore: -1 });
hashtagTrendSchema.index({ sourceName: 1, heatScore: -1 });

export const HashtagTrend: Model<HashtagTrendAttrs> =
  models?.HashtagTrend ?? model<HashtagTrendAttrs>("HashtagTrend", hashtagTrendSchema, "hashtag_trends");
