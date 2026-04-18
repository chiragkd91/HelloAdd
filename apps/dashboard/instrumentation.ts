/**
 * Next.js instrumentation — runs in the Node.js server runtime only.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startSyncCron } = await import("@/lib/sync/cron");
  startSyncCron();
  const { startReportCron } = await import("@/lib/reports/scheduler");
  startReportCron();
  const { startWhatsAppDigestCron } = await import("@/lib/notifications/whatsappDigestCron");
  startWhatsAppDigestCron();
  const { startAgencyDigestCron } = await import("@/lib/ai/agencyDigestCron");
  startAgencyDigestCron();
}
