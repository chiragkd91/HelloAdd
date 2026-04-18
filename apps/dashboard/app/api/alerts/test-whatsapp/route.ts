import { Organization } from "@helloadd/database";
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";
import { sendWhatsAppText } from "@/lib/notifications/whatsapp";

/** Sends a test WhatsApp message to the org’s `settings.whatsappNumber`. */
export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  const org = await Organization.findById(auth.organizationId).lean();
  const phone = org?.settings?.whatsappNumber?.trim();
  if (!phone) {
    return jsonError("Add a WhatsApp number in Settings → Alerts first", 400);
  }

  try {
    await sendWhatsAppText(
      phone,
      "Hello Add — test message ✅\n\nYour WhatsApp alerts are configured. You’ll receive critical issues here automatically.",
      { organizationId: auth.organizationId }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("WHATSAPP_NOT_CONFIGURED")) {
      return jsonError(
        "WhatsApp Cloud API not configured — connect WhatsApp Business in Integrations or set WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_API_TOKEN",
        503
      );
    }
    return jsonError(msg, 502);
  }

  return jsonOk({ ok: true, sentTo: phone });
}
