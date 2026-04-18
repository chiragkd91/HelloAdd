import cron from "node-cron";
import { Alert, Organization, connectMongo } from "@helloadd/database";
import { sendWhatsAppText } from "@/lib/notifications/whatsapp";

let started = false;

/**
 * Once per day (~9:00 IST → 03:30 UTC): send one WhatsApp summarizing WARNING-level alerts.
 * Enable with ENABLE_WHATSAPP_DIGEST_CRON=true on a long-lived Node server.
 */
export function startWhatsAppDigestCron(): void {
  if (started) return;
  if (process.env.ENABLE_WHATSAPP_DIGEST_CRON !== "true") {
    return;
  }
  started = true;

  cron.schedule("30 3 * * *", async () => {
    try {
      await connectMongo();
      const orgs = await Organization.find({
        "settings.whatsappNumber": { $exists: true, $nin: [null, ""] },
      })
        .select(["_id", "settings"])
        .lean();

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const org of orgs) {
        const phone = org.settings?.whatsappNumber?.trim();
        if (!phone) continue;

        const warnings = await Alert.find({
          organizationId: org._id,
          severity: "WARNING",
          createdAt: { $gte: since },
        })
          .sort({ createdAt: -1 })
          .limit(15)
          .lean();

        if (warnings.length === 0) continue;

        const lines = warnings.map((w, i) => `${i + 1}. ${w.title}: ${w.message.slice(0, 120)}`);
        const body = `Hello Add — Daily warning digest\n\n${lines.join("\n\n")}\n\n_Open Hello Add to review._`;
        try {
          await sendWhatsAppText(phone, body, { organizationId: org._id });
        } catch (e) {
          console.error("[whatsapp-digest]", org._id, e);
        }
      }
    } catch (e) {
      console.error("[whatsapp-digest]", e);
    }
  });
}
