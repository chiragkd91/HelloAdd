import { NextRequest } from "next/server";
import { loadAgencyInvoiceForAgency, toInvoicePdfInput } from "@/lib/agency/invoiceContext";
import { buildAgencyInvoicePdfBytes } from "@/lib/agency/invoicePdf";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonError } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/rbac";
import type { AppRouteCtx } from "@/lib/api/routeContext";

type Ctx = AppRouteCtx<{ id: string }>;

function safeFilename(n: string): string {
  return n.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "invoice";
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(_req);
  if (!auth.ok) return auth.response;
  if (!requireRole(auth.role, "OWNER")) {
    return jsonError("Only owners can download agency invoice PDFs", 403);
  }

  const { id: invoiceId } = await ctx.params;
  if (!invoiceId) return jsonError("Missing id", 400);

  const loaded = await loadAgencyInvoiceForAgency(auth.organizationId, invoiceId);
  if (!loaded) {
    return jsonError("Invoice not found", 404);
  }

  const bytes = await buildAgencyInvoicePdfBytes(toInvoicePdfInput(loaded));
  const filename = `${safeFilename(loaded.invoice.invoiceNumber)}.pdf`;

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
