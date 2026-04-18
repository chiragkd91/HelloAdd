import {
  AgencyClientRelation,
  AgencyInvoice,
  AgencyPlan,
  Organization,
  connectMongo,
} from "@helloadd/database";

const GST_RATE = 0.18;

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

export async function runAgencyInvoiceCron(now: Date = new Date()): Promise<string[]> {
  await connectMongo();

  const rels = await AgencyClientRelation.find({ status: "ACTIVE" }).lean();
  const created: string[] = [];

  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const billingPeriodFrom = new Date(Date.UTC(y, m, 1));
  const billingPeriodTo = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

  for (const rel of rels) {
    const org = await Organization.findById(rel.clientOrgId).lean();
    if (!org?.parentAgencyId) continue;
    const agencyId = org.parentAgencyId;

    const exists = await AgencyInvoice.findOne({
      agencyOrgId: agencyId,
      clientOrgId: rel.clientOrgId,
      billingPeriodFrom: { $gte: billingPeriodFrom, $lte: billingPeriodTo },
    }).lean();
    if (exists) continue;

    const planId = org.assignedPlanId ?? null;
    let amount = rel.contractValue ?? 0;
    if (planId) {
      const plan = await AgencyPlan.findById(planId).lean();
      if (plan?.monthlyPrice != null) amount = plan.monthlyPrice;
    }

    const gstAmount = Math.round(amount * GST_RATE * 100) / 100;
    const totalAmount = Math.round((amount + gstAmount) * 100) / 100;
    const dueDate = new Date(billingPeriodTo);
    dueDate.setUTCDate(dueDate.getUTCDate() + 7);

    const invoiceNumber = await nextInvoiceNumber(agencyId);
    const doc = await AgencyInvoice.create({
      agencyOrgId: agencyId,
      clientOrgId: rel.clientOrgId,
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
    created.push(doc._id);
  }

  return created;
}
