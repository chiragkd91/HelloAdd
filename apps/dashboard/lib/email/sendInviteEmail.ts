/**
 * Team invite emails via Resend (https://resend.com/docs/send-with-node).
 * Same transport pattern as `lib/reports/reportEmail.ts`.
 */
export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  orgName: string,
  inviterName: string,
  role: string,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return false;
  }

  const from =
    process.env.RESEND_INVITES_FROM?.trim() ??
    process.env.RESEND_FROM?.trim() ??
    "Hello Add <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${inviterName} has invited you to ${orgName} on Hello Add`,
      html: `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#6845ab">You have been invited!</h2>
      <p>${inviterName} has invited you to join <strong>${escapeHtml(orgName)}</strong> as <strong>${escapeHtml(role)}</strong> on Hello Add.</p>
      <a href="${inviteUrl}" style="background:#6845ab;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">Accept Invitation</a>
      <p style="color:#6B7280;font-size:12px">This link expires in 14 days. If you did not expect this invitation, ignore this email.</p>
      <p style="color:#6B7280;font-size:12px">Hello Add — Sab Ads. Ek Jagah.</p>
    </div>
  `,
    }),
  });

  return res.ok;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
