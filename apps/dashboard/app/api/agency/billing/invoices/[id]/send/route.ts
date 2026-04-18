import { NextRequest } from "next/server";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonError, jsonOk } from "@/lib/api/http";
import { loadAgencyInvoiceForAgency, toInvoicePdfInput } from "@/lib/agency/invoiceContext";
import { buildAgencyInvoicePdfBytes } from "@/lib/agency/invoicePdf";
import { requireRole } from "@/lib/auth/rbac";
import { sendAgencyInvoiceEmail } from "@/lib/email/sendAgencyInvoiceEmail";

type Ctx = { params: { id: string } };

function safeFilename(n: string): string {
  return `${n.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "invoice"}.pdf`;
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(_req);
  if (!auth.ok) return auth.response;
  if (!requireRole(auth.role, "OWNER")) {
    return jsonError("Only owners can send agency invoices", 403);
  }

  const invoiceId = ctx.params.id;
  if (!invoiceId) return jsonError("Missing id", 400);

  const loaded = await loadAgencyInvoiceForAgency(auth.organizationId, invoiceId);
  if (!loaded) {
    return jsonError("Invoice not found", 404);
  }

  const to = loaded.relation.contactEmail?.trim();
  if (!to) {
    return jsonError(
      "No billing contact email for this client. Add contact email on the client profile.",
      400,
    );
  }

  const pdfInput = toInvoicePdfInput(loaded);
  const bytes = await buildAgencyInvoicePdfBytes(pdfInput);
  const pdfBase64 = Buffer.from(bytes).toString("base64");
  const pdfFilename = safeFilename(loaded.invoice.invoiceNumber);

  const clientDisplay = loaded.relation.tradeName?.trim() || loaded.clientOrg.name;

  const sent = await sendAgencyInvoiceEmail(to, {
    agencyName: loaded.agencyOrg.name,
    clientName: clientDisplay,
    invoiceNumber: loaded.invoice.invoiceNumber,
    totalAmount: loaded.invoice.totalAmount,
    dueDateIso: loaded.invoice.dueDate.toISOString(),
    pdfBase64,
    pdfFilename,
  });

  if (!sent) {
    return jsonError("Email could not be sent. Set RESEND_API_KEY and RESEND_FROM (or RESEND_BILLING_FROM).", 502);
  }

  if (loaded.invoice.status === "DRAFT") {
    loaded.invoice.status = "SENT";
    await loaded.invoice.save();
  }

  return jsonOk({
    emailed: true,
    status: loaded.invoice.status,
  });
}
