import { NextRequest } from "next/server";
import { z } from "zod";
import { askAboutClient, type ChatMessage } from "@/lib/ai/chatAssistant";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserOrgRole } from "@/lib/auth/rbac";

const bodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  clientOrgId: z.string().optional(),
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

  const { messages, clientOrgId } = parsed.data;
  const reply = await askAboutClient(
    auth.organizationId,
    clientOrgId,
    messages as ChatMessage[],
    "Workspace",
  );

  return jsonOk({ reply });
}
