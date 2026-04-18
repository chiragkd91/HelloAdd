import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";

export const ReportJobStatusValues = ["QUEUED", "READY", "FAILED"] as const;
export type ReportJobStatus = (typeof ReportJobStatusValues)[number];

export type ReportAttrs = {
  _id: string;
  organizationId: string;
  reportType: string;
  status: ReportJobStatus;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const reportSchema = new Schema<ReportAttrs>(
  {
    _id: { type: String, default: () => createId() },
    organizationId: { type: String, required: true, ref: "Organization" },
    reportType: { type: String, required: true },
    status: { type: String, enum: ReportJobStatusValues, required: true },
    dateFrom: { type: Date, default: null },
    dateTo: { type: Date, default: null },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true },
);

reportSchema.index({ organizationId: 1, reportType: 1, createdAt: -1 });

export const Report: Model<ReportAttrs> =
  models?.Report ?? model<ReportAttrs>("Report", reportSchema, "reports");
