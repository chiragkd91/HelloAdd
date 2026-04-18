import { createId } from "@paralleldrive/cuid2";
import { Schema, model, models, type Model } from "mongoose";
import {
  AgencyClientStatusValues,
  AgencyIntegrationHintStateValues,
  PlatformValues,
  type AgencyClientStatus,
  type AgencyIntegrationHintState,
  type Platform,
} from "../enums";

export type AgencyClientRelationAttrs = {
  _id: string;
  agencyOrgId: string;
  clientOrgId: string;
  contractValue: number;
  contractCurrency: string;
  assignedAM?: string | null;
  assignedCM?: string | null;
  status: AgencyClientStatus;
  startDate: Date;
  notes?: string | null;
  /** Primary contact at the client (person name). */
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  /** Brand, trade, or “agency” name if different from the workspace title. */
  tradeName?: string | null;
  /** Optional city / region from onboarding. */
  city?: string | null;
  website?: string | null;
  /** Per-platform hints from client onboarding (before OAuth completes). */
  integrationHints?: Array<{
    platform: Platform;
    state: AgencyIntegrationHintState;
    manualAccountId?: string | null;
    whatsappPhone?: string | null;
    bsp?: string | null;
  }>;
  createdAt: Date;
};

const agencyClientRelationSchema = new Schema<AgencyClientRelationAttrs>(
  {
    _id: { type: String, default: () => createId() },
    agencyOrgId: { type: String, required: true, ref: "Organization", index: true },
    clientOrgId: { type: String, required: true, ref: "Organization", index: true },
    contractValue: { type: Number, default: 0 },
    contractCurrency: { type: String, default: "INR" },
    assignedAM: { type: String, default: null, ref: "User" },
    assignedCM: { type: String, default: null, ref: "User" },
    status: { type: String, enum: AgencyClientStatusValues, default: "ACTIVE" },
    startDate: { type: Date, default: () => new Date() },
    notes: { type: String, default: null },
    contactName: { type: String, default: null },
    contactPhone: { type: String, default: null },
    contactEmail: { type: String, default: null },
    tradeName: { type: String, default: null },
    city: { type: String, default: null },
    website: { type: String, default: null },
    integrationHints: {
      type: [
        {
          platform: { type: String, enum: PlatformValues, required: true },
          state: { type: String, enum: AgencyIntegrationHintStateValues, required: true },
          manualAccountId: { type: String, default: null },
          whatsappPhone: { type: String, default: null },
          bsp: { type: String, default: null },
        },
      ],
      default: [],
    },
    createdAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

agencyClientRelationSchema.index({ agencyOrgId: 1, clientOrgId: 1 }, { unique: true });

export const AgencyClientRelation: Model<AgencyClientRelationAttrs> =
  models?.AgencyClientRelation ??
  model<AgencyClientRelationAttrs>(
    "AgencyClientRelation",
    agencyClientRelationSchema,
    "agency_client_relations",
  );
