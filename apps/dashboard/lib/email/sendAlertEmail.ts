/**
 * Resend — transactional alerts & weekly digest (no attachments).
 * @see https://resend.com/docs/send-with-node
 */

export type WeeklyDigestData = {
  orgName: string;
  /** e.g. "January 6, 2026" */
  weekOfLabel: string;
  totalSpend: number;
  totalLeads: number;
  avgCtr: number;
  issuesBySeverity: { critical: number; warning: number; info: number };
  topPlatform: string;
  dashboardUrl: string;
};

async function sendEmailHtml(params: { to: string; subject: string; html: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const from = process.env.RESEND_FROM ?? "Hello Add <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Resend failed: ${res.status} ${t.slice(0, 200)}`);
  }
}

function moneyInr(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function weeklyDigestEmailHtml(data: WeeklyDigestData): string {
  const { issuesBySeverity } = data;
  const issuesTotal = issuesBySeverity.critical + issuesBySeverity.warning + issuesBySeverity.info;
  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
  <div style="background:#6845ab;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
    <strong style="font-size:20px;">Hello Add</strong>
    <div style="font-size:13px;opacity:0.95;margin-top:4px;">Weekly digest</div>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 16px;">Here’s your snapshot for <strong>${escapeHtml(data.orgName)}</strong> — week of <strong>${escapeHtml(data.weekOfLabel)}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px;background:#F9FAFB;">Total spend (period)</td><td style="padding:8px;font-weight:bold;">${moneyInr(data.totalSpend)}</td></tr>
      <tr><td style="padding:8px;">Total leads</td><td style="padding:8px;font-weight:bold;">${data.totalLeads.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding:8px;background:#F9FAFB;">Avg CTR</td><td style="padding:8px;font-weight:bold;">${data.avgCtr.toFixed(2)}%</td></tr>
      <tr><td style="padding:8px;">Top platform</td><td style="padding:8px;font-weight:bold;">${escapeHtml(data.topPlatform)}</td></tr>
    </table>
    <p style="background:#FEF2F2;padding:12px;border-radius:8px;font-size:14px;">
      <strong>Issues (this period):</strong> ${issuesTotal} total —
      Critical: ${issuesBySeverity.critical}, Warning: ${issuesBySeverity.warning}, Info: ${issuesBySeverity.info}
    </p>
    <p style="margin-top:20px;">
      <a href="${data.dashboardUrl}" style="display:inline-block;background:#6845ab;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">View dashboard</a>
    </p>
    <p style="font-size:11px;color:#9CA3AF;margin-top:28px;border-top:1px solid #E5E7EB;padding-top:12px;">
      You’re receiving this because weekly digests are enabled for your workspace.
      To stop these emails, turn off “Weekly report &amp; digest” in Hello Add → Settings → Alerts or contact your admin.
    </p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendWeeklyDigestEmail(to: string, data: WeeklyDigestData): Promise<void> {
  const subject = `Hello Add — Weekly Digest — ${data.orgName} — Week of ${data.weekOfLabel}`;
  await sendEmailHtml({
    to,
    subject,
    html: weeklyDigestEmailHtml(data),
  });
}

export type CampaignAlertEmailParams = {
  orgName: string;
  title: string;
  message: string;
  severity: string;
  campaignName?: string;
  dashboardUrl: string;
};

export function campaignAlertEmailHtml(p: CampaignAlertEmailParams): string {
  const camp = p.campaignName ? `<p style="margin:8px 0;"><strong>Campaign:</strong> ${escapeHtml(p.campaignName)}</p>` : "";
  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
  <div style="background:#DC2626;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
    <strong style="font-size:18px;">Hello Add alert</strong>
    <div style="font-size:12px;margin-top:4px;">${escapeHtml(p.severity)}</div>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 8px;font-size:16px;font-weight:700;">${escapeHtml(p.title)}</p>
    <p style="margin:0 0 12px;color:#374151;">${escapeHtml(p.message)}</p>
    ${camp}
    <p style="margin-top:20px;">
      <a href="${p.dashboardUrl}" style="display:inline-block;background:#6845ab;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">View dashboard</a>
    </p>
    <p style="font-size:11px;color:#9CA3AF;margin-top:24px;">Sent because your workspace has an alert email configured. Adjust in Hello Add → Settings → Alerts.</p>
  </div>
</body>
</html>`;
}

export async function sendCampaignAlertEmail(to: string, params: CampaignAlertEmailParams): Promise<void> {
  const subject = `Hello Add — ${params.title} — ${params.orgName}`;
  await sendEmailHtml({
    to,
    subject,
    html: campaignAlertEmailHtml(params),
  });
}
