import { PlatformValues, type Platform } from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { loadAgencyClient } from "@/lib/api/agencyClientAccess";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonError, jsonOk } from "@/lib/api/http";
import { syncOrganization } from "@/lib/sync/syncEngine";

type Ctx = { params: { id: string } };

const bodySchema = z
  .object({
    platform: z.enum(PlatformValues as unknown as [string, ...string[]]).optional(),
  })
  .strict();

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;

  const clientOrgId = ctx.params.id;
  if (!clientOrgId) return jsonError("Missing client id", 400);

  const bundle = await loadAgencyClient(auth.organizationId, clientOrgId);
  if (!bundle) return jsonError("Client not found", 404);

  let platform: Platform | undefined;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const text = await req.text();
    if (text.trim()) {
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        return jsonError("Invalid JSON body", 400);
      }
      const parsed = bodySchema.safeParse(raw);
      if (!parsed.success) {
        return jsonError("Validation failed", 400, parsed.error.flatten());
      }
      platform = parsed.data.platform as Platform | undefined;
    }
  }

  const result = await syncOrganization(clientOrgId, platform ? { platform } : undefined);

  return jsonOk({
    ok: true,
    organizationId: clientOrgId,
    platform: platform ?? null,
    synced: result.synced,
    errors: result.errors,
    lastSyncedAt: result.lastSyncedAt,
  });
}
