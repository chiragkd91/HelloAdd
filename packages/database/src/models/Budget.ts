import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";

export type BudgetAttrs = {
  _id: string;
  organizationId: string;
  month: number;
  year: number;
  totalBudget: number;
  platforms: Record<string, unknown>;
  createdAt: Date;
};

const budgetSchema = new Schema<BudgetAttrs>(
  {
    _id: { type: String, default: () => createId() },
    organizationId: { type: String, required: true, ref: "Organization" },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    totalBudget: { type: Number, required: true },
    platforms: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

budgetSchema.index({ organizationId: 1, month: 1, year: 1 }, { unique: true });

export const Budget: Model<BudgetAttrs> =
  models?.Budget ?? model<BudgetAttrs>("Budget", budgetSchema, "budgets");
