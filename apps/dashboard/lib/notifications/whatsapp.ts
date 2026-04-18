/**
 * Meta WhatsApp Cloud API — send messages from your business phone number.
 * Uses per-organization Integration (platform WHATSAPP) when present, else env vars.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import { Integration, connectMongo } from "@helloadd/database";

const GRAPH_VERSION = "v19.0";

export type SendWhatsAppOpts = {
  /** When set, uses stored WhatsApp Business Cloud credentials for this org before falling back to env. */
  organizationId?: string;
};

export type AlertData = {
  campaignName?: string;
  platform?: string;
  spent?: number;
  total?: number;
  pct?: number;
  ctr?: number;
  benchmark?: number;
  days?: number;
  spend?: number;
  extraAmount?: number;
  dashboardUrl?: string;
  /** Fallback body for generic / creative-rejected style alerts */
  message?: string;
};

export type WeeklyData = {
  name: string;
  spend: number;
  impressions: number;
  ctr: number;
  topPlatform: string;
  errors: number;
  url: string;
};

function requireWhatsAppConfigFromEnv(): { phoneNumberId: string; token: string } {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_API_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error("WHATSAPP_NOT_CONFIGURED");
  }
  return { phoneNumberId, token };
}

async function resolveWhatsAppCloudCredentials(
  opts?: SendWhatsAppOpts
): Promise<{ phoneNumberId: string; token: string }> {
  if (opts?.organizationId) {
    await connectMongo();
    const doc = await Integration.findOne({
      organizationId: opts.organizationId,
      platform: "WHATSAPP",
      isActive: true,
    }).lean();
    if (doc?.accessToken && doc.accountId) {
      return { phoneNumberId: doc.accountId.trim(), token: doc.accessToken };
    }
  }
  return requireWhatsAppConfigFromEnv();
}

/** Indian E.164 without +: 919876543210 */
export function normalizeIndianWhatsAppTo(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.startsWith("91") && d.length >= 12) return d;
  return d;
}

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export async function sendWhatsAppText(
  to: string,
  message: string,
  opts?: SendWhatsAppOpts
): Promise<void> {
  const { phoneNumberId, token } = await resolveWhatsAppCloudCredentials(opts);
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizeIndianWhatsAppTo(to),
      type: "text",
      text: { body: message.slice(0, 4096) },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`WHATSAPP_SEND_FAILED:${res.status}:${t.slice(0, 200)}`);
  }
}

/**
 * Template-style copy for dashboard alert types (plain text; works without Meta message templates).
 */
export async function sendWhatsAppAlert(
  to: string,
  alertType: string,
  data: AlertData,
  opts?: SendWhatsAppOpts
): Promise<void> {
  const c = data.campaignName ?? "Campaign";
  const plat = data.platform ?? "—";

  let body: string;
  switch (alertType) {
    case "BUDGET_WARNING":
      body = `Hello Add Alert 🔔

*Budget Warning*
Campaign: ${c}
Platform: ${plat}
Spent: ${money(data.spent ?? 0)} of ${money(data.total ?? 0)} (${data.pct ?? 0}%)

_Reply STOP to unsubscribe_`;
      break;
    case "CTR_DROP":
      body = `Hello Add Alert ⚠️

*CTR Drop Detected*
Campaign: ${c}
Current CTR: ${data.ctr ?? 0}%
Benchmark: ${data.benchmark ?? 0}%

Suggested action: Refresh creative or adjust targeting

_via Hello Add_`;
      break;
    case "CAMPAIGN_EXPIRING":
      body = `Hello Add Reminder ⏰

*Campaign Expiring Soon*
${c} ends in ${data.days ?? 0} day(s)

CTR: ${data.ctr ?? 0}% | Spend: ${money(data.spend ?? 0)}

Login to renew: ${data.dashboardUrl ?? "—"}`;
      break;
    case "OVERSPEND":
      body = `Hello Add Alert 🚨

*Budget Overspend*
Campaign: ${c}
Overspent by: ${data.pct ?? 0}%
Extra spend: ${money(data.extraAmount ?? 0)}

Action required immediately!`;
      break;
    default:
      body =
        data.message ??
        `Hello Add Alert

*${alertType}*
Campaign: ${c}
Platform: ${plat}

_via Hello Add_`;
  }

  await sendWhatsAppText(to, body, opts);
}

export async function sendWeeklyDigestWhatsApp(
  to: string,
  weeklyData: WeeklyData,
  opts?: SendWhatsAppOpts
): Promise<void> {
  const health =
    weeklyData.errors > 0
      ? `⚠️ ${weeklyData.errors} issues need attention`
      : "✅ All campaigns healthy";
  const body = `📊 Hello Add Weekly Digest

Hi ${weeklyData.name}! Here's your week:

✅ Total Spend: ${money(weeklyData.spend)}
📈 Impressions: ${weeklyData.impressions.toLocaleString("en-IN")}
🎯 Avg CTR: ${weeklyData.ctr.toFixed(2)}%
⚡ Top Platform: ${weeklyData.topPlatform}

${health}

View dashboard: ${weeklyData.url}`;

  await sendWhatsAppText(to, body, opts);
}
