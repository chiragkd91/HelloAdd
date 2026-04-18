import {
  AgencyClientRelation,
  AgencyInvoice,
  AgencyPlan,
  Organization,
  connectMongo,
} from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/rbac";

const GST_RATE = 0.18;

const postSchema = z.object({
  clientOrgId: z.string().min(1),
  billingPeriodFrom: z.string().optional(),
  billingPeriodTo: z.string().optional(),
  dueDate: z.string().optional(),
});

function monthBounds(d: Date) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

async function nextInvoiceNumber(agencyOrgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const existing = await AgencyInvoice.find({
    agencyOrgId,
    invoiceNumber: new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
  })
    .select("invoiceNumber")
    .lean();
  let max = 0;
  for (const row of existing) {
    const n = row.invoiceNumber.slice(prefix.length);
    const num = parseInt(n, 10);
    if (!Number.isNaN(num) && num > max) max = num;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export async function GET(req: NextRequest) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;
  if (!requireRole(auth.role, "OWNER")) {
    return jsonError("Only owners can view agency billing dashboard", 403);
  }

  await connectMongo();
  const agencyId = auth.organizationId;

  await AgencyInvoice.updateMany(
    { agencyOrgId: agencyId, status: "SENT", dueDate: { $lt: new Date() } },
    { $set: { status: "OVERDUE" } },
  );

  const rels = await AgencyClientRelation.find({ agencyOrgId: agencyId }).lean();
  const clientIds = rels.map((r) => r.clientOrgId);
  const orgs = await Organization.find({ _id: { $in: clientIds } }).lean();
  const orgById = new Map(orgs.map((o) => [o._id, o]));

  let totalMonthlyRevenue = 0;
  let activeClients = 0;
  let inactiveClients = 0;
  for (const r of rels) {
    if (r.status === "ACTIVE") {
      activeClients += 1;
      totalMonthlyRevenue += r.contractValue ?? 0;
    } else {
      inactiveClients += 1;
    }
  }

  const invoices = await AgencyInvoice.find({ agencyOrgId: agencyId }).sort({ createdAt: -1 }).limit(200).lean();

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  let invoicesPendingAmount = 0;
  for (const inv of invoices) {
    if (inv.status === "SENT" || inv.status === "OVERDUE") {
      invoicesPendingAmount += inv.totalAmount;
    }
  }

  let thisMonthCollected = 0;
  for (const inv of invoices) {
    if (inv.status === "PAID" && inv.paidAt && inv.paidAt >= startOfMonth && inv.paidAt <= endOfMonth) {
      thisMonthCollected += inv.totalAmount;
    }
  }

  const planIds = [...new Set(orgs.map((o) => o.assignedPlanId).filter(Boolean))] as string[];
  const plans = planIds.length
    ? await AgencyPlan.find({ _id: { $in: planIds } })
        .select("planName")
        .lean()
    : [];
  const planNameById = new Map(plans.map((p) => [p._id, p.planName]));

  const invoiceRows = invoices.map((inv) => {
    const o = orgById.get(inv.clientOrgId);
    return {
      id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      clientOrgId: inv.clientOrgId,
      clientName: o?.name ?? "Unknown",
      planId: inv.planId,
      planName: inv.planId ? (planNameById.get(inv.planId) ?? null) : null,
      amount: inv.amount,
      gstAmount: inv.gstAmount,
      totalAmount: inv.totalAmount,
      currency: inv.currency,
      status: inv.status,
      dueDate: inv.dueDate.toISOString(),
      paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
      billingPeriodFrom: inv.billingPeriodFrom.toISOString(),
      billingPeriodTo: inv.billingPeriodTo.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    };
  });

  const clientsForPicker = rels.map((r) => {
    const o = orgById.get(r.clientOrgId);
    return {
      clientOrgId: r.clientOrgId,
      name: o?.name ?? "Unknown",
      contractValue: r.contractValue,
      status: r.status,
      assignedPlanId: o?.assignedPlanId ?? null,
      planName: o?.assignedPlanId ? (planNameById.get(o.assignedPlanId) ?? null) : null,
    };
  });

  return jsonOk({
    summary: {
      totalMonthlyRevenue,
      activeClients,
      inactiveClients,
      invoicesPendingAmount,
      thisMonthCollected,
    },
    invoices: invoiceRows,
    clients: clientsForPicker,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;
  if (!requireRole(auth.role, "OWNER")) {
    return jsonError("Only owners can create agency invoices", 403);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  await connectMongo();
  const agencyId = auth.organizationId;
  const { clientOrgId } = parsed.data;

  const rel = await AgencyClientRelation.findOne({
    agencyOrgId: agencyId,
    clientOrgId,
  }).lean();
  if (!rel) {
    return jsonError("Client not found for this agency", 404);
  }

  const org = await Organization.findById(clientOrgId).lean();
  if (!org) {
    return jsonError("Organization missing", 404);
  }

  const planId = org.assignedPlanId ?? null;
  let amount = rel.contractValue ?? 0;
  if (planId) {
    const plan = await AgencyPlan.findById(planId).lean();
    if (plan?.monthlyPrice != null) {
      amount = plan.monthlyPrice;
    }
  }

  const now = new Date();
  const fromStr = parsed.data.billingPeriodFrom?.trim();
  const toStr = parsed.data.billingPeriodTo?.trim();
  const dueStr = parsed.data.dueDate?.trim();

  let billingPeriodFrom: Date;
  let billingPeriodTo: Date;
  if (fromStr && toStr) {
    billingPeriodFrom = new Date(fromStr);
    billingPeriodTo = new Date(toStr);
    if (Number.isNaN(billingPeriodFrom.getTime()) || Number.isNaN(billingPeriodTo.getTime())) {
      return jsonError("Invalid billing period dates", 400);
    }
  } else {
    const b = monthBounds(now);
    billingPeriodFrom = b.start;
    billingPeriodTo = b.end;
  }

  let dueDate: Date;
  if (dueStr) {
    dueDate = new Date(dueStr);
    if (Number.isNaN(dueDate.getTime())) {
      return jsonError("Invalid due date", 400);
    }
  } else {
    dueDate = new Date(billingPeriodTo);
    dueDate.setUTCDate(dueDate.getUTCDate() + 7);
  }

  const gstAmount = Math.round(amount * GST_RATE * 100) / 100;
  const totalAmount = Math.round((amount + gstAmount) * 100) / 100;
  const invoiceNumber = await nextInvoiceNumber(agencyId);

  const doc = await AgencyInvoice.create({
    agencyOrgId: agencyId,
    clientOrgId,
    planId,
    invoiceNumber,
    amount,
    currency: "INR",
    gstAmount,
    totalAmount,
    status: "DRAFT",
    dueDate,
    paidAt: null,
    billingPeriodFrom,
    billingPeriodTo,
  });

  return jsonOk({
    id: doc._id,
    invoiceNumber: doc.invoiceNumber,
    status: doc.status,
    totalAmount: doc.totalAmount,
  });
}
