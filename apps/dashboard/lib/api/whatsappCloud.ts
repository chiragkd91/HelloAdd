/**
 * WhatsApp Business Cloud API — validate Phone Number ID + token before saving Integration.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const GRAPH_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type WhatsAppPhoneNumberInfo = {
  verifiedName?: string;
  displayPhoneNumber?: string;
  qualityRating?: string;
};

/** Normalize Graph phone number id (digits only). */
export function normalizeWhatsAppPhoneNumberId(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Verifies credentials by fetching phone number metadata from Graph.
 */
export async function fetchWhatsAppPhoneNumberInfo(
  phoneNumberId: string,
  accessToken: string
): Promise<WhatsAppPhoneNumberInfo> {
  const id = normalizeWhatsAppPhoneNumberId(phoneNumberId);
  if (id.length < 8) {
    throw new Error("WHATSAPP_INVALID_PHONE_NUMBER_ID");
  }

  const url = new URL(`${GRAPH_BASE}/${id}`);
  url.searchParams.set("fields", "verified_name,display_phone_number,quality_rating");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  });
  const json = (await res.json()) as {
    error?: { message?: string };
    verified_name?: string;
    display_phone_number?: string;
    quality_rating?: string;
  };

  if (!res.ok || json.error) {
    const msg = json.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`WHATSAPP_GRAPH: ${msg}`);
  }

  return {
    verifiedName: json.verified_name,
    displayPhoneNumber: json.display_phone_number,
    qualityRating: json.quality_rating,
  };
}
