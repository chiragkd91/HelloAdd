import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["video/mp4", "mp4"],
]);

/**
 * POST multipart/form-data with field `file` for scheduler media.
 * Persists to /public/uploads/scheduler-media and returns public URL.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

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
    return jsonError("File too large (max 20 MB)", 400);
  }

  const mime = blob.type;
  const ext = ALLOWED_TYPES.get(mime);
  if (!ext) {
    return jsonError("Unsupported file type. Use JPG, PNG, WEBP, GIF, or MP4", 400);
  }

  const buf = Buffer.from(await blob.arrayBuffer());
  const publicDir = join(process.cwd(), "public", "uploads", "scheduler-media");
  await mkdir(publicDir, { recursive: true });

  const filename = `${auth.organizationId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await writeFile(join(publicDir, filename), buf);

  const url = `/uploads/scheduler-media/${filename}`;
  return jsonOk({ url, mime, size: blob.size });
}
