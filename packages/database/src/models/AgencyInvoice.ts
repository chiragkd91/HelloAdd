import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";
import { AgencyInvoiceStatusValues, type AgencyInvoiceStatus } from "../enums";

export type AgencyInvoiceAttrs = {
  _id: string;
  agencyOrgId: string;
  clientOrgId: string;
  planId: string | null;
  invoiceNumber: string;
  amount: number;
  currency: string;
  gstAmount: number;
  totalAmount: number;
  status: AgencyInvoiceStatus;
  dueDate: Date;
  paidAt: Date | null;
  billingPeriodFrom: Date;
  billingPeriodTo: Date;
  createdAt: Date;
};

const agencyInvoiceSchema = new Schema<AgencyInvoiceAttrs>(
  {
    _id: { type: String, default: () => createId() },
    agencyOrgId: { type: String, required: true, ref: "Organization", index: true },
    clientOrgId: { type: String, required: true, ref: "Organization", index: true },
    planId: { type: String, default: null, ref: "AgencyPlan" },
    invoiceNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    gstAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: AgencyInvoiceStatusValues, default: "DRAFT" },
    dueDate: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    billingPeriodFrom: { type: Date, required: true },
    billingPeriodTo: { type: Date, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

agencyInvoiceSchema.index({ agencyOrgId: 1, invoiceNumber: 1 }, { unique: true });
agencyInvoiceSchema.index(
  { agencyOrgId: 1, clientOrgId: 1, billingPeriodFrom: 1, billingPeriodTo: 1 },
  { unique: true },
);
agencyInvoiceSchema.index({ agencyOrgId: 1, status: 1, dueDate: 1 });

export const AgencyInvoice: Model<AgencyInvoiceAttrs> =
  models?.AgencyInvoice ?? model<AgencyInvoiceAttrs>("AgencyInvoice", agencyInvoiceSchema, "agency_invoices");
