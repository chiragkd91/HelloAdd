import { Integration, connectMongo } from "@helloadd/database";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  fetchWhatsAppPhoneNumberInfo,
  normalizeWhatsAppPhoneNumberId,
} from "@/lib/api/whatsappCloud";
import { enforceAgencyWhatsAppConnect } from "@/lib/agency/agencyPlanEnforcement";
import { loadAgencyClient } from "@/lib/api/agencyClientAccess";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";

type Ctx = { params: { id: string } };

const connectSchema = z.object({
  phoneNumberId: z.string().min(8, "Phone Number ID is required"),
  accessToken: z.string().min(32, "Access token looks too short"),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;

  const clientOrgId = ctx.params.id;
  if (!clientOrgId) return jsonError("Missing client id", 400);

  const bundle = await loadAgencyClient(auth.organizationId, clientOrgId);
  if (!bundle) return jsonError("Client not found", 404);

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

  const wa = await enforceAgencyWhatsAppConnect(clientOrgId);
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
    { organizationId: clientOrgId, platform: "WHATSAPP" },
    {
      $set: {
        organizationId: clientOrgId,
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
    { new: true, upsert: true },
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

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(_req);
  if (!auth.ok) return auth.response;

  const clientOrgId = ctx.params.id;
  if (!clientOrgId) return jsonError("Missing client id", 400);

  const bundle = await loadAgencyClient(auth.organizationId, clientOrgId);
  if (!bundle) return jsonError("Client not found", 404);

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const r = await Integration.deleteOne({
    organizationId: clientOrgId,
    platform: "WHATSAPP",
  });

  if (r.deletedCount === 0) {
    return jsonError("WhatsApp integration not found", 404);
  }

  return jsonOk({ ok: true });
}
