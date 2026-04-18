import { connectMongo } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { publishDuePosts } from "@/lib/scheduler/publisher";

/**
 * Publishes scheduled posts whose `scheduledAt` is due (same logic as in-process cron).
 * Call from Vercel Cron or any external scheduler on a 1–5 minute cadence.
 *
 * Authorization: `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set.
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
    await connectMongo();
    const result = await publishDuePosts();
    return jsonOk({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonError(`Publish run failed: ${message}`, 500);
  }
}
