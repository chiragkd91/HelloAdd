import { connectMongo, Integration } from "@helloadd/database";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  fetchWhatsAppPhoneNumberInfo,
  normalizeWhatsAppPhoneNumberId,
} from "@/lib/api/whatsappCloud";
import { enforceAgencyWhatsAppConnect } from "@/lib/agency/agencyPlanEnforcement";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

const connectSchema = z.object({
  phoneNumberId: z.string().min(8, "Phone Number ID is required"),
  accessToken: z.string().min(32, "Access token looks too short"),
});

/** Save WhatsApp Business Cloud credentials (validated via Graph). */
export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = connectSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const wa = await enforceAgencyWhatsAppConnect(auth.organizationId);
  if (wa) return wa;

  const { phoneNumberId: rawId, accessToken } = parsed.data;
  const idNorm = normalizeWhatsAppPhoneNumberId(rawId);

  let info;
  try {
    info = await fetchWhatsAppPhoneNumberInfo(idNorm, accessToken);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError(msg.replace(/^WHATSAPP_GRAPH:\s*/i, "") || "Could not verify WhatsApp credentials", 400);
  }

  const accountName =
    info.verifiedName && info.displayPhoneNumber
      ? `${info.verifiedName} (${info.displayPhoneNumber})`
      : info.displayPhoneNumber ?? info.verifiedName ?? `WhatsApp · ${idNorm}`;

  const doc = await Integration.findOneAndUpdate(
    { organizationId: auth.organizationId, platform: "WHATSAPP" },
    {
      $set: {
        organizationId: auth.organizationId,
        platform: "WHATSAPP",
        accessToken,
        refreshToken: null,
        tokenExpiresAt: null,
        accountId: idNorm,
        accountName,
        isActive: true,
        connectedAt: new Date(),
      },
    },
    { new: true, upsert: true }
  ).lean();

  if (!doc) {
    return jsonError("Failed to save integration", 500);
  }

  return jsonOk({
    ok: true,
    id: doc._id,
    accountId: doc.accountId,
    accountName: doc.accountName,
  });
}

/** Disconnect WhatsApp Business Cloud for this workspace. */
export async function DELETE(_req: NextRequest) {
  const auth = await requireUserOrgRole(_req, "MANAGER");
  if (!auth.ok) return auth.response;

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const r = await Integration.deleteOne({
    organizationId: auth.organizationId,
    platform: "WHATSAPP",
  });

  if (r.deletedCount === 0) {
    return jsonError("WhatsApp integration not found", 404);
  }

  return jsonOk({ ok: true });
}
