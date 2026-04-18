/**
 * Resend API — https://resend.com/docs/send-with-node
 */
export async function sendReportEmail(params: {
  to: string;
  subject: string;
  html: string;
  pdfBytes: Uint8Array;
  filename?: string;
}): Promise<void> {
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
      attachments: [
        {
          filename: params.filename ?? "helloadd-report.pdf",
          content: Buffer.from(params.pdfBytes).toString("base64"),
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Resend failed: ${res.status} ${t.slice(0, 200)}`);
  }
}

export function reportEmailHtml(params: {
  name: string;
  orgName: string;
  summary: { totalSpend: number; impressions: number; avgCTR: number; conversions: number };
  topPlatform: string;
  dashboardUrl: string;
}): string {
  const m = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
  <div style="background:#6845ab;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
    <strong style="font-size:20px;">Hello Add</strong>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
    <p>Hi ${params.name},</p>
    <p>Your report for <strong>${params.orgName}</strong> is ready.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px;background:#F9FAFB;">Total spend</td><td style="padding:8px;font-weight:bold;">${m(params.summary.totalSpend)}</td></tr>
      <tr><td style="padding:8px;">Impressions</td><td style="padding:8px;font-weight:bold;">${params.summary.impressions.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding:8px;background:#F9FAFB;">Avg CTR</td><td style="padding:8px;font-weight:bold;">${params.summary.avgCTR.toFixed(2)}%</td></tr>
      <tr><td style="padding:8px;">Conversions</td><td style="padding:8px;font-weight:bold;">${params.summary.conversions}</td></tr>
    </table>
    <p style="background:#ECFDF5;padding:12px;border-radius:8px;"><strong>Key insight:</strong> Top platform this period — ${params.topPlatform}.</p>
    <p style="margin-top:20px;">
      <a href="${params.dashboardUrl}" style="display:inline-block;background:#6845ab;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">View dashboard</a>
    </p>
    <p style="font-size:12px;color:#6B7280;margin-top:24px;">PDF attached. helloadd.com</p>
  </div>
</body>
</html>`;
}
