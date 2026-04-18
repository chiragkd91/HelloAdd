import { NextRequest } from "next/server";
import { z } from "zod";
import { generateSchedulerImage } from "@/lib/ai/generateSchedulerImage";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

const bodySchema = z.object({
  prompt: z.string().min(3).max(4000),
  size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).optional(),
  model: z.enum(["dall-e-3", "dall-e-2"]).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const result = await generateSchedulerImage({
    organizationId: auth.organizationId,
    prompt: parsed.data.prompt,
    size: parsed.data.size,
    model: parsed.data.model,
  });

  if (!result.ok) {
    return jsonError(result.error, result.status ?? 500);
  }

  return jsonOk({ url: result.url });
}
