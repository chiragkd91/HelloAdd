import {
  AgencyClientRelation,
  AgencyInvoice,
  AgencyPlan,
  Organization,
  connectMongo,
  type AgencyInvoiceAttrs,
  type Platform,
} from "@helloadd/database";
import type { InvoicePdfInput } from "@/lib/agency/invoicePdf";

type AgencyInvoiceDoc = AgencyInvoiceAttrs & { save: () => Promise<unknown> };

function platformLabel(p: Platform): string {
  const map: Record<string, string> = {
    FACEBOOK: "Facebook",
    INSTAGRAM: "Instagram",
    GOOGLE: "Google",
    LINKEDIN: "LinkedIn",
    YOUTUBE: "YouTube",
    TWITTER: "Twitter",
    WHATSAPP: "WhatsApp",
  };
  return map[p] ?? p;
}

export type LoadedAgencyInvoiceContext = {
  invoice: AgencyInvoiceDoc;
  agencyOrg: { name: string };
  clientOrg: { name: string };
  plan: { planName: string; allowedPlatforms: Platform[] } | null;
  relation: { contactEmail: string | null; contactName: string | null; city: string | null; tradeName: string | null };
};

export async function loadAgencyInvoiceForAgency(
  agencyOrgId: string,
  invoiceId: string,
): Promise<LoadedAgencyInvoiceContext | null> {
  await connectMongo();
  const inv = await AgencyInvoice.findOne({ _id: invoiceId, agencyOrgId });
  if (!inv) return null;

  const [agencyOrg, clientOrg, rel] = await Promise.all([
    Organization.findById(agencyOrgId).select("name").lean(),
    Organization.findById(inv.clientOrgId).select("name").lean(),
    AgencyClientRelation.findOne({ agencyOrgId, clientOrgId: inv.clientOrgId }).lean(),
  ]);

  if (!agencyOrg || !clientOrg) return null;

  let plan: LoadedAgencyInvoiceContext["plan"] = null;
  if (inv.planId) {
    const p = await AgencyPlan.findById(inv.planId).select("planName allowedPlatforms").lean();
    if (p) {
      plan = { planName: p.planName, allowedPlatforms: p.allowedPlatforms ?? [] };
    }
  }

  return {
    invoice: inv,
    agencyOrg: { name: agencyOrg.name ?? "Agency" },
    clientOrg: { name: clientOrg.name ?? "Client" },
    plan,
    relation: {
      contactEmail: rel?.contactEmail ?? null,
      contactName: rel?.contactName ?? null,
      city: rel?.city ?? null,
      tradeName: rel?.tradeName ?? null,
    },
  };
}

export function platformSummaryFromPlan(plan: LoadedAgencyInvoiceContext["plan"]): string {
  if (!plan?.allowedPlatforms?.length) return "";
  return plan.allowedPlatforms.map(platformLabel).join(", ");
}

export function toInvoicePdfInput(ctx: LoadedAgencyInvoiceContext): InvoicePdfInput {
  const { invoice, agencyOrg, clientOrg, plan, relation } = ctx;
  const displayClient = relation.tradeName?.trim() || clientOrg.name;
  const clientLines: string[] = [];
  if (relation.contactName?.trim()) clientLines.push(relation.contactName.trim());
  if (relation.city?.trim()) clientLines.push(relation.city.trim());

  const from = invoice.billingPeriodFrom;
  const to = invoice.billingPeriodTo;
  const sameMonth =
    from.getUTCMonth() === to.getUTCMonth() && from.getUTCFullYear() === to.getUTCFullYear();
  const billingPeriodLabel = sameMonth
    ? from.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : `${from.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${to.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`;

  const footerNote = process.env.AGENCY_INVOICE_PAYMENT_NOTE?.trim();

  return {
    agencyName: agencyOrg.name,
    clientName: displayClient,
    clientLines,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.createdAt,
    dueDate: invoice.dueDate,
    billingPeriodLabel,
    planName: plan?.planName ?? null,
    platformSummary: platformSummaryFromPlan(plan),
    amount: invoice.amount,
    gstAmount: invoice.gstAmount,
    totalAmount: invoice.totalAmount,
    currency: invoice.currency,
    footerNote,
  };
}
