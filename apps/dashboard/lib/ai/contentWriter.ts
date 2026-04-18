import {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_OPENAI_CONTENT_MODEL,
  checkAIRateLimit,
  getAnthropic,
  getOpenAI,
  logAIUsage,
  resolveAITextProvider,
} from "@/lib/ai/client";

export type ContentInput = {
  organizationId: string;
  topic: string;
  platforms: string[];
  language: "HINDI" | "ENGLISH" | "HINGLISH";
  tone: "PROFESSIONAL" | "CASUAL" | "FESTIVE" | "URGENT";
  includeHashtags: boolean;
  includeEmoji: boolean;
  brandName?: string;
  productName?: string;
};

export type ContentVariants = {
  instagram?: { caption: string; hashtags: string[] };
  facebook?: { post: string };
  linkedin?: { post: string };
  whatsapp?: { message: string };
  adCopy?: {
    headline1: string;
    headline2: string;
    description: string;
  };
};

function fallbackContent(input: ContentInput): ContentVariants {
  const base = `${input.brandName ?? "Brand"}: ${input.topic}`;
  const emoji = input.includeEmoji ? " 🚀" : "";
  const hash = input.includeHashtags ? ["#HelloAdd", "#Marketing", "#Growth"] : [];
  return {
    instagram: {
      caption: `${base}${emoji}`,
      hashtags: hash,
    },
    facebook: { post: `${base}${emoji}` },
    linkedin: { post: `${base}. ${input.tone === "PROFESSIONAL" ? "Let us connect and discuss." : "Join us today."}` },
    whatsapp: { message: `${base}${emoji}` },
    adCopy: {
      headline1: `${input.productName ?? input.brandName ?? "Your Brand"} Offer`,
      headline2: "Limited Time",
      description: input.topic,
    },
  };
}

function cleanAndParseJson(raw: string): ContentVariants | null {
  const clean = raw.replace(/```json|```/g, "").trim();
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < firstBrace) return null;
  const sliced = clean.slice(firstBrace, lastBrace + 1);
  try {
    const obj = JSON.parse(sliced) as ContentVariants;
    return obj;
  } catch {
    return null;
  }
}

function buildContentPrompts(input: ContentInput): { system: string; user: string } {
  const system = `You are an expert Indian social media content writer.
Write engaging content for Indian businesses.
Support Hindi, English, and Hinglish (Hindi+English mix).
Always respond with a single valid JSON object only. No markdown, no code fences.
For Instagram: include relevant hashtags (10-15) when requested.
For WhatsApp: short, conversational, mobile-friendly.
For LinkedIn: professional, no hashtag spam.
Return keys only for platforms that are requested.`;

  const user = `Create social media content for ${input.brandName || "a business"} about: "${input.topic}"
Language preference: ${input.language}
Tone: ${input.tone}
${input.includeEmoji ? "Include relevant emojis" : "No emojis"}
${input.includeHashtags ? "Include hashtags where relevant" : "Avoid hashtags"}
Platforms needed: ${input.platforms.join(", ")}
${input.productName ? `Product: ${input.productName}` : ""}

Return JSON with platform-specific content optimized for each platform.
Also include adCopy versions (headline + description) for Facebook/Google ads.`;

  return { system, user };
}

export async function generatePostContent(input: ContentInput): Promise<ContentVariants> {
  const provider = resolveAITextProvider();
  if (!provider) {
    return fallbackContent(input);
  }

  const allowed = await checkAIRateLimit(input.organizationId);
  if (!allowed) {
    return fallbackContent(input);
  }

  const { system, user } = buildContentPrompts(input);

  try {
    if (provider === "openai") {
      const openai = getOpenAI();
      if (!openai) return fallbackContent(input);

      const completion = await openai.chat.completions.create({
        model: DEFAULT_OPENAI_CONTENT_MODEL,
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const raw = completion.choices[0]?.message?.content?.trim() ?? "";
      const u = completion.usage;
      const inputTokens = u?.prompt_tokens ?? 0;
      const outputTokens = u?.completion_tokens ?? 0;
      const estimatedCostUSD = inputTokens * 0.15e-6 + outputTokens * 0.6e-6;
      await logAIUsage(input.organizationId, "content_writer", inputTokens, outputTokens, {
        estimatedCostUSD,
      });
      const parsed = cleanAndParseJson(raw);
      return parsed ?? fallbackContent(input);
    }

    const anthropic = getAnthropic();
    if (!anthropic) return fallbackContent(input);

    const response = await anthropic.messages.create({
      model: DEFAULT_CLAUDE_MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    });
    await logAIUsage(
      input.organizationId,
      "content_writer",
      response.usage.input_tokens,
      response.usage.output_tokens,
    );
    const first = response.content[0];
    if (first.type !== "text") {
      return fallbackContent(input);
    }
    const parsed = cleanAndParseJson(first.text);
    return parsed ?? fallbackContent(input);
  } catch {
    return fallbackContent(input);
  }
}
