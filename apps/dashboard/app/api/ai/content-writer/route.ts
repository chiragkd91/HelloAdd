import { NextRequest } from "next/server";
import { z } from "zod";
import { generatePostContent } from "@/lib/ai/contentWriter";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

const bodySchema = z.object({
  topic: z.string().min(3),
  platforms: z.array(z.string().min(1)).min(1),
  language: z.enum(["HINDI", "ENGLISH", "HINGLISH"]),
  tone: z.enum(["PROFESSIONAL", "CASUAL", "FESTIVE", "URGENT"]),
  includeHashtags: z.boolean().default(true),
  includeEmoji: z.boolean().default(true),
  brandName: z.string().optional(),
  productName: z.string().optional(),
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

  const content = await generatePostContent({
    organizationId: auth.organizationId,
    topic: parsed.data.topic,
    platforms: parsed.data.platforms,
    language: parsed.data.language,
    tone: parsed.data.tone,
    includeHashtags: parsed.data.includeHashtags,
    includeEmoji: parsed.data.includeEmoji,
    brandName: parsed.data.brandName,
    productName: parsed.data.productName,
  });

  return jsonOk({ content });
}
