import {
  DEFAULT_CLAUDE_MODEL,
  checkAIRateLimit,
  getAnthropic,
  isAnthropicConfigured,
  logAIUsage,
} from "@/lib/ai/client";

export async function getAIErrorExplanation(
  errorType: string,
  campaignName: string,
  platform: string,
  details: string,
  organizationId: string,
): Promise<{ explanation: string; steps: string[] } | null> {
  const allowed = await checkAIRateLimit(organizationId);
  if (!allowed) {
    return {
      explanation: details,
      steps: ["Review campaign settings in the ad platform", "Align budgets and dates in Hello Add", "Contact support if the issue persists"],
    };
  }

  const client = getAnthropic();
  if (!isAnthropicConfigured() || !client) {
    return null;
  }

  try {
    const response = await client.messages.create({
      model: DEFAULT_CLAUDE_MODEL,
      max_tokens: 300,
      system:
        'You are a digital marketing expert. Explain ad campaign issues in simple language and give exact steps to fix them. Respond ONLY in JSON: {"explanation": "...", "steps": ["step1", "step2", "step3"]}',
      messages: [
        {
          role: "user",
          content: `Campaign "${campaignName}" on ${platform} has this issue: ${errorType}. Details: ${details}. Give a 1-sentence explanation and 3 exact steps to fix it.`,
        },
      ],
    });

    const u = response.usage;
    await logAIUsage(organizationId, "error_explainer", u.input_tokens, u.output_tokens);

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as { explanation?: string; steps?: string[] };
    if (typeof parsed.explanation !== "string" || !Array.isArray(parsed.steps)) {
      return null;
    }
    return { explanation: parsed.explanation, steps: parsed.steps.filter((s) => typeof s === "string") };
  } catch (e) {
    console.error("[errorExplainer] Anthropic failed", e);
    return null;
  }
}
