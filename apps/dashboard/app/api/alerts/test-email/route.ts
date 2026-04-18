import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";
import { sendWeeklyDigestEmail } from "@/lib/email/sendAlertEmail";
import { buildWeeklyDigestData, getDigestRecipientEmail } from "@/lib/email/weeklyDigestData";

/** Sends a real weekly digest email using live org data (same template as Monday cron). */
export async function POST(request: NextRequest) {
  const auth = await requireUserOrgRole(request, "MANAGER");
  if (!auth.ok) return auth.response;

  const to = await getDigestRecipientEmail(auth.organizationId);
  if (!to) {
    return jsonError("Add an alert or report email in Settings → Alerts first", 400);
  }

  try {
    const data = await buildWeeklyDigestData(auth.organizationId);
    if (!data) {
      return jsonError("Could not build digest for this workspace", 500);
    }
    await sendWeeklyDigestEmail(to, data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("RESEND_API_KEY")) {
      return jsonError("Email not configured (RESEND_API_KEY)", 503);
    }
    return jsonError(msg, 502);
  }

  return jsonOk({ ok: true, sentTo: to });
}
