import { AgencyInvoice, connectMongo } from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/rbac";

type Ctx = { params: { id: string } };

const patchSchema = z
  .object({
    status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE"]).optional(),
    markPaid: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No updates" });

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;
  if (!requireRole(auth.role, "OWNER")) {
    return jsonError("Only owners can update invoice status", 403);
  }

  const invoiceId = ctx.params.id;
  if (!invoiceId) return jsonError("Missing id", 400);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  await connectMongo();
  const inv = await AgencyInvoice.findOne({ _id: invoiceId, agencyOrgId: auth.organizationId });
  if (!inv) {
    return jsonError("Invoice not found", 404);
  }

  if (parsed.data.markPaid) {
    inv.status = "PAID";
    inv.paidAt = new Date();
  } else if (parsed.data.status) {
    inv.status = parsed.data.status;
    if (parsed.data.status === "PAID") {
      inv.paidAt = new Date();
    }
  }

  await inv.save();

  return jsonOk({
    id: inv._id,
    status: inv.status,
    paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
  });
}
