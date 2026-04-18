import { AgencyClientRelation, Alert, Campaign, Organization, connectMongo } from "@helloadd/database";
import {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_OPENAI_CHAT_MODEL,
  checkAIRateLimit,
  getAnthropic,
  getOpenAI,
  logAIUsage,
  resolveAITextProvider,
} from "@/lib/ai/client";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function askAboutClient(
  organizationId: string,
  clientOrgId: string | undefined,
  messages: ChatMessage[],
  clientName: string,
): Promise<string> {
  await connectMongo();

  let targetOrg = organizationId;
  let resolvedClientName = clientName?.trim() || "Workspace";
  if (clientOrgId && clientOrgId.trim()) {
    const requestedOrgId = clientOrgId.trim();
    if (requestedOrgId !== organizationId) {
      const relation = await AgencyClientRelation.findOne({
        agencyOrgId: organizationId,
        clientOrgId: requestedOrgId,
        status: "ACTIVE",
      })
        .select("clientOrgId")
        .lean();
      if (!relation) {
        return "Selected client is not linked to your agency workspace.";
      }
      targetOrg = requestedOrgId;
      const org = await Organization.findById(requestedOrgId).select("name").lean();
      if (org?.name?.trim()) {
        resolvedClientName = org.name.trim();
      }
    }
  }

  const allowed = await checkAIRateLimit(organizationId);
  if (!allowed) {
    return "AI assistant rate limit reached for this workspace. Please try again in about an hour.";
  }

  const provider = resolveAITextProvider();
  if (!provider) {
    return "AI assistant is not configured. Set OPENAI_API_KEY and/or ANTHROPIC_API_KEY on the server (chat prefers OpenAI when its key is present).";
  }

  const campaigns = await Campaign.find({ organizationId: targetOrg }).limit(15).lean();
  const alerts = await Alert.find({ organizationId: targetOrg, isRead: false }).limit(5).lean();

  const totalSpend = campaigns.reduce((s, c) => s + c.budgetSpent, 0);
  const avgCtr =
    campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.ctr, 0) / campaigns.length : 0;
  const totalLeads = campaigns.reduce((s, c) => s + c.conversions, 0);

  const clientContext = `You are an AI assistant for Hello Add — a CMO ad intelligence platform used by digital marketing agencies.
You are helping analyze data for: ${resolvedClientName}

CURRENT DATA:
Active LIVE campaigns: ${campaigns.filter((c) => c.status === "LIVE").length}
Total recorded spend (campaign totals): ₹${totalSpend.toLocaleString("en-IN")}
Average CTR (campaign-level): ${avgCtr.toFixed(2)}%
Total leads (conversions): ${totalLeads}
Open unread alerts: ${alerts.length}

CAMPAIGN SUMMARY:
${campaigns
  .slice(0, 8)
  .map(
    (c) =>
      `- ${c.name} (${c.platform}): CTR ${c.ctr.toFixed(2)}%, Spend ₹${c.budgetSpent.toLocaleString("en-IN")}, Status: ${c.status}`,
  )
  .join("\n")}

OPEN ALERTS:
${alerts.map((a) => `- [${a.severity}] ${a.title}`).join("\n") || "No open alerts"}

Answer questions about ad performance. Be specific, data-driven, and concise.
Suggest concrete actions when relevant. Use ₹ for currency. Keep answers under 200 words.`;

  const recent = messages.slice(-10);

  if (provider === "openai") {
    const openai = getOpenAI();
    if (!openai) {
      return "AI assistant is not configured (OpenAI client unavailable).";
    }
    const completion = await openai.chat.completions.create({
      model: DEFAULT_OPENAI_CHAT_MODEL,
      max_tokens: 500,
      messages: [
        { role: "system", content: clientContext },
        ...recent.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim() ?? "Unable to process request.";
    const u = completion.usage;
    const inputTokens = u?.prompt_tokens ?? 0;
    const outputTokens = u?.completion_tokens ?? 0;
    // gpt-4o-mini list pricing (approximate)
    const estimatedCostUSD = inputTokens * 0.15e-6 + outputTokens * 0.6e-6;
    await logAIUsage(organizationId, "chat_assistant", inputTokens, outputTokens, {
      estimatedCostUSD,
    });
    return text;
  }

  const client = getAnthropic();
  if (!client) {
    return "AI assistant is not configured (Anthropic client unavailable).";
  }

  const response = await client.messages.create({
    model: DEFAULT_CLAUDE_MODEL,
    max_tokens: 500,
    system: clientContext,
    messages: recent.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const u = response.usage;
  await logAIUsage(organizationId, "chat_assistant", u.input_tokens, u.output_tokens);

  const block = response.content[0];
  return block.type === "text" ? block.text : "Unable to process request.";
}
