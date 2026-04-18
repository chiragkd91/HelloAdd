import { Organization, connectMongo } from "@helloadd/database";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

/**
 * POST multipart/form-data with field `file` (PNG, JPEG, or WebP, max 2MB).
 * Saves under /public/uploads/client-portal-logos/ and updates settings.clientPortalBranding.logoUrl.
 * Agency workspaces only. Ephemeral on serverless unless persistent storage is mounted.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  await connectMongo();
  const org = await Organization.findById(auth.organizationId).lean();
  if (!org?.isAgency) {
    return jsonError("Logo upload is only available for agency workspaces", 403);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Invalid form data", 400);
  }

  const file = form.get("file");
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
    return jsonError("Missing file field", 400);
  }

  const blob = file as File;
  if (blob.size > MAX_BYTES) {
    return jsonError("File too large (max 2 MB)", 400);
  }

  const mime = blob.type;
  const ext = ALLOWED_TYPES.get(mime);
  if (!ext) {
    return jsonError("Use PNG, JPEG, or WebP", 400);
  }

  const buf = Buffer.from(await blob.arrayBuffer());
  const publicDir = join(process.cwd(), "public", "uploads", "client-portal-logos");
  await mkdir(publicDir, { recursive: true });
  const filename = `${auth.organizationId}-${Date.now()}.${ext}`;
  const diskPath = join(publicDir, filename);
  await writeFile(diskPath, buf);

  const logoUrl = `/uploads/client-portal-logos/${filename}`;

  await Organization.findOneAndUpdate(
    { _id: auth.organizationId },
    { $set: { "settings.clientPortalBranding.logoUrl": logoUrl } },
    { new: true },
  );

  return jsonOk({ logoUrl });
}
