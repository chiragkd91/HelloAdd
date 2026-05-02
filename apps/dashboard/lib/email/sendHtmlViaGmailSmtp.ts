/** True when Gmail (or compatible SMTP) credentials are present. */
export function isGmailSmtpConfigured(): boolean {
  const u = process.env.GMAIL_SMTP_USER?.trim();
  const p = process.env.GMAIL_SMTP_APP_PASSWORD?.trim();
  return Boolean(u && p);
}

/** Send HTML via SMTP (default Gmail). App password, not your Gmail login password. */
export async function sendHtmlViaSmtp(opts: {
  to: string;
  from: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const user = process.env.GMAIL_SMTP_USER?.trim();
  const passRaw = process.env.GMAIL_SMTP_APP_PASSWORD?.trim();
  if (!user || !passRaw) return false;

  const pass = passRaw.replace(/\s/g, "");
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "465");
  const secure = port === 465;

  try {
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(port === 587 ? { requireTLS: true } : {}),
      auth: { user, pass },
    });

    await transport.sendMail({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return true;
  } catch (e) {
    console.error("[sendHtmlViaSmtp] failed", e);
    return false;
  }
}
