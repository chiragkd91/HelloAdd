/**
 * Send agency invoice notification with optional PDF attachment (Resend).
 */
export async function sendAgencyInvoiceEmail(
  to: string,
  opts: {
    agencyName: string;
    clientName: string;
    invoiceNumber: string;
    totalAmount: number;
    dueDateIso: string;
    pdfBase64?: string;
    pdfFilename?: string;
  },
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return false;
  }

  const from =
    process.env.RESEND_BILLING_FROM?.trim() ??
    process.env.RESEND_FROM?.trim() ??
    "Hello Add <onboarding@resend.dev>";

  const due = new Date(opts.dueDateIso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const body: Record<string, unknown> = {
    from,
    to: [to],
    subject: `Invoice ${opts.invoiceNumber} from ${opts.agencyName}`,
    html: `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#6845ab">Invoice ${escapeHtml(opts.invoiceNumber)}</h2>
      <p>Hi ${escapeHtml(opts.clientName)},</p>
      <p><strong>${escapeHtml(opts.agencyName)}</strong> has issued an invoice for <strong>₹${opts.totalAmount.toLocaleString("en-IN")}</strong>.</p>
      <p style="color:#6B7280">Due date: ${escapeHtml(due)}</p>
      <p style="color:#6B7280;font-size:12px">The PDF is attached to this email when available.</p>
      <p style="color:#6B7280;font-size:12px">Hello Add — Sab Marketing. Ek Jagah.</p>
    </div>
  `,
  };

  if (opts.pdfBase64 && opts.pdfFilename) {
    body.attachments = [{ filename: opts.pdfFilename, content: opts.pdfBase64 }];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
