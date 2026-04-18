import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { AIUsageLog, Organization, connectMongo } from "@helloadd/database";
import type { AIUsageFeature } from "@helloadd/database";

const orgUsageMap = new Map<string, { count: number; resetAt: number }>();

function rateLimitForPlan(plan: string | undefined): number {
  const trial = Number(process.env.AI_RATE_LIMIT_TRIAL ?? 20);
  const starter = Number(process.env.AI_RATE_LIMIT_STARTER ?? 50);
  const growth = Number(process.env.AI_RATE_LIMIT_GROWTH ?? 200);
  const agency = Number(process.env.AI_RATE_LIMIT_AGENCY ?? 1000);
  const limits: Record<string, number> = {
    STARTER: starter,
    GROWTH: growth,
    AGENCY: agency,
    TRIAL: trial,
  };
  return limits[plan ?? ""] ?? trial;
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Server-side Anthropic client. Never import this file from client components. */
export function getAnthropic(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export const DEFAULT_CLAUDE_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** Server-side OpenAI client. Never import from client components. */
export function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

/** Chat model for `/api/ai/chat` when using OpenAI. */
export const DEFAULT_OPENAI_CHAT_MODEL =
  process.env.OPENAI_CHAT_MODEL?.trim() ||
  process.env.OPENAI_MODEL?.trim() ||
  "gpt-4o-mini";

/** Scheduler / `content-writer` model when using OpenAI (falls back to chat model envs). */
export const DEFAULT_OPENAI_CONTENT_MODEL =
  process.env.OPENAI_CONTENT_MODEL?.trim() ||
  process.env.OPENAI_CHAT_MODEL?.trim() ||
  process.env.OPENAI_MODEL?.trim() ||
  "gpt-4o-mini";

/**
 * Text-generation backend for dashboard AI chat and scheduler content writer.
 * `AI_TEXT_PROVIDER` overrides `AI_CHAT_PROVIDER` when set (same values: openai | anthropic).
 * Unset = prefer OpenAI when OPENAI_API_KEY exists, else Anthropic.
 */
export function resolveAITextProvider(): "openai" | "anthropic" | null {
  const pref =
    process.env.AI_TEXT_PROVIDER?.trim().toLowerCase() ||
    process.env.AI_CHAT_PROVIDER?.trim().toLowerCase();
  if (pref === "anthropic") {
    if (isAnthropicConfigured()) return "anthropic";
    if (isOpenAIConfigured()) return "openai";
    return null;
  }
  if (pref === "openai") {
    if (isOpenAIConfigured()) return "openai";
    if (isAnthropicConfigured()) return "anthropic";
    return null;
  }
  if (isOpenAIConfigured()) return "openai";
  if (isAnthropicConfigured()) return "anthropic";
  return null;
}

/** @deprecated Use resolveAITextProvider — same behavior (chat + content writer). */
export const resolveAIChatProvider = resolveAITextProvider;

/**
 * Per-organization hourly cap. In-memory (reset on deploy); upgrade to Redis for multi-instance.
 * Agency client orgs (`parentAgencyId`): also enforce monthly `planFeatures.aiCredits` vs `AIUsageLog`
 * (each logged call = one credit). Negative credits = unlimited for the month.
 */
export async function checkAIRateLimit(organizationId: string): Promise<boolean> {
  await connectMongo();
  const clock = new Date();
  const now = clock.getTime();
  const org = await Organization.findById(organizationId)
    .select(["plan", "parentAgencyId", "planFeatures"])
    .lean();

  if (org?.parentAgencyId && org.planFeatures) {
    const cap = org.planFeatures.aiCredits;
    if (typeof cap === "number") {
      if (cap === 0) return false;
      if (cap > 0) {
        const since = new Date(Date.UTC(clock.getUTCFullYear(), clock.getUTCMonth(), 1));
        const used = await AIUsageLog.countDocuments({
          organizationId,
          createdAt: { $gte: since },
        });
        if (used >= cap) return false;
      }
    }
  }

  const usage = orgUsageMap.get(organizationId);

  if (!usage || usage.resetAt < now) {
    orgUsageMap.set(organizationId, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }

  const limit = rateLimitForPlan(org?.plan);

  if (usage.count >= limit) return false;
  usage.count += 1;
  return true;
}

export async function logAIUsage(
  organizationId: string,
  feature: AIUsageFeature | string,
  inputTokens: number,
  outputTokens: number,
  options?: { estimatedCostUSD?: number },
): Promise<void> {
  const totalTokens = inputTokens + outputTokens;
  const estimatedCostUSD =
    options?.estimatedCostUSD ??
    inputTokens * 0.000_003 + outputTokens * 0.000_015;

  try {
    await connectMongo();
    await AIUsageLog.create({
      organizationId,
      feature,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUSD,
      createdAt: new Date(),
    });
  } catch (e) {
    console.error("[ai] AIUsageLog create failed", e);
  }

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[AI Usage] org=${organizationId} feature=${feature} in=${inputTokens} out=${outputTokens} ~$${estimatedCostUSD.toFixed(4)}`,
    );
  }
}
