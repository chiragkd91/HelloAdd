import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";
import { AlertTypeValues, SeverityValues, type AlertType, type Severity } from "../enums";

export type AlertAttrs = {
  _id: string;
  organizationId: string;
  type: AlertType;
  title: string;
  message: string;
  isRead: boolean;
  severity: Severity;
  campaignId?: string | null;
  /** Optional Claude-generated explanation (server-side only). */
  aiExplanation?: string | null;
  aiFixSteps?: string[] | null;
  createdAt: Date;
};

const alertSchema = new Schema<AlertAttrs>(
  {
    _id: { type: String, default: () => createId() },
    organizationId: { type: String, required: true, ref: "Organization" },
    type: { type: String, enum: AlertTypeValues, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    severity: { type: String, enum: SeverityValues, required: true },
    campaignId: { type: String, default: null },
    aiExplanation: { type: String, default: null },
    aiFixSteps: { type: [String], default: null },
    createdAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

alertSchema.index({ organizationId: 1 });

export const Alert: Model<AlertAttrs> =
  models?.Alert ?? model<AlertAttrs>("Alert", alertSchema, "alerts");
