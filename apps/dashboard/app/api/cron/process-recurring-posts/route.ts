import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { processRecurringPosts } from "@/lib/scheduler/recurring";

/**
 * Creates the next scheduled instance for recurring posts after all platforms have published.
 * Run on the same cadence as other crons (e.g. hourly) with CRON_SECRET.
 */
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

  try {
    const result = await processRecurringPosts();
    return jsonOk({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonError(`Recurring run failed: ${message}`, 500);
  }
}
