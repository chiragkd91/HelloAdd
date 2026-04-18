import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { runAgencyInvoiceCron } from "@/lib/agency/invoiceCron";

/** Optional monthly job: create DRAFT invoices for active clients (Vercel Cron / external scheduler). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    return jsonError("CRON_SECRET not configured", 503);
  }
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return jsonError("Unauthorized", 401);
    }
  }

  const created = await runAgencyInvoiceCron();

  return jsonOk({ ok: true, draftsCreated: created.length, ids: created });
}
