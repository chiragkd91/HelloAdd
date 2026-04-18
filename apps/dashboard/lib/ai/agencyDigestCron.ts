import { connectMongo, Organization } from "@helloadd/database";
import cron from "node-cron";
import { generateAgencyWeeklyDigest } from "@/lib/ai/agencyDigest";

let started = false;

/**
 * Long-lived Node only. Set `ENABLE_AGENCY_DIGEST_CRON=true`.
 * Mondays ~04:00 UTC — logs digest text for each org with `isAgency: true` (email delivery TBD).
 */
export function startAgencyDigestCron(): void {
  if (started) return;
  if (process.env.ENABLE_AGENCY_DIGEST_CRON !== "true") {
    return;
  }
  started = true;

  cron.schedule("45 3 * * 1", async () => {
    try {
      await connectMongo();
      const orgs = await Organization.find({ isAgency: true }).select(["_id", "name"]).lean();
      for (const o of orgs) {
        try {
          const text = await generateAgencyWeeklyDigest(o._id);
          if (text) {
            console.log(`[agency-digest] ${o.name ?? o._id}\n${text}\n---`);
          }
        } catch (e) {
          console.error("[agency-digest] org", o._id, e);
        }
      }
    } catch (e) {
      console.error("[agency-digest] batch", e);
    }
  });
}
