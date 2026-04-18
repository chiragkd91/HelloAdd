import cron from "node-cron";
import { connectMongo, Integration } from "@helloadd/database";
import { runAgencyInvoiceCron } from "@/lib/agency/invoiceCron";
import { syncOrganization } from "@/lib/sync/syncEngine";
import { publishDuePosts } from "@/lib/scheduler/publisher";

let started = false;

/**
 * Hourly sync for all organizations that have at least one active integration.
 * Use only on long-lived Node hosts (e.g. `next start`, Docker). Serverless platforms
 * do not run this reliably — prefer an external scheduler calling `POST /api/sync`
 * or a dedicated worker.
 */
export function startSyncCron(): void {
  if (started) return;
  if (process.env.ENABLE_SYNC_CRON !== "true") {
    return;
  }
  started = true;

  cron.schedule("0 * * * *", async () => {
    try {
      await connectMongo();
      const orgIds = await Integration.distinct("organizationId", { isActive: true });
      for (const organizationId of orgIds) {
        try {
          await syncOrganization(organizationId);
        } catch (e) {
          console.error("[sync-cron] organization", organizationId, e);
        }
      }
    } catch (e) {
      console.error("[sync-cron]", e);
    }
  });

  /** Serverless: call GET /api/cron/publish-scheduled-posts with CRON_SECRET instead. */
  cron.schedule("* * * * *", async () => {
    try {
      await connectMongo();
      await publishDuePosts();
    } catch (e) {
      console.error("[post-publisher-cron]", e);
    }
  });

  cron.schedule("5 0 1 * *", async () => {
    try {
      const created = await runAgencyInvoiceCron();
      if (created.length > 0) {
        console.log(`[agency-invoice-cron] created ${created.length} draft invoice(s)`);
      }
    } catch (e) {
      console.error("[agency-invoice-cron]", e);
    }
  });
}
