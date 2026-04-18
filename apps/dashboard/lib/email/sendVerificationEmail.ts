/**
 * Sends “verify your email” link via Resend (same transport as `sendInviteEmail.ts`).
 */
export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return false;
  }

  const from =
    process.env.RESEND_VERIFICATION_FROM?.trim() ??
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
      subject: "Verify your email for Hello Add",
      html: `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#6845ab">Confirm your email</h2>
      <p>Thanks for signing up. Click the button below to verify your work email and open your workspace.</p>
      <a href="${verifyUrl}" style="background:#6845ab;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">Verify email</a>
      <p style="color:#6B7280;font-size:12px">This link expires in 48 hours. If you didn’t create an account, you can ignore this email.</p>
      <p style="color:#6B7280;font-size:12px">Hello Add — Sab Ads. Ek Jagah.</p>
    </div>
  `,
    }),
  });

  return res.ok;
}
