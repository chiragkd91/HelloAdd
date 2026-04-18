import { PlatformValues, type Platform } from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";
import { syncOrganization } from "@/lib/sync/syncEngine";

const bodySchema = z
  .object({
    platform: z.enum(PlatformValues as unknown as [string, ...string[]]).optional(),
  })
  .strict();

/** Manual sync (pulls campaigns + today’s metrics for active integrations). Optional body: `{ platform }`. */
export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

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

  const result = await syncOrganization(auth.organizationId, platform ? { platform } : undefined);

  return jsonOk({
    ok: true,
    organizationId: auth.organizationId,
    platform: platform ?? null,
    synced: result.synced,
    errors: result.errors,
    lastSyncedAt: result.lastSyncedAt,
  });
}
