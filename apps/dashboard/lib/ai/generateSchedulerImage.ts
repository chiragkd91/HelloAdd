import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  checkAIRateLimit,
  getOpenAI,
  isOpenAIConfigured,
  logAIUsage,
} from "@/lib/ai/client";

const DALLE3_STD_1024_COST_USD = 0.04;

export type GenerateSchedulerImageSize = "1024x1024" | "1792x1024" | "1024x1792";
export type GenerateSchedulerImageModel = "dall-e-3" | "dall-e-2";

export type GenerateSchedulerImageResult =
  | { ok: true; url: string }
  | { ok: false; error: string; status?: number };

/**
 * Generates an image via OpenAI Images API, saves it under public uploads (stable URL for scheduling).
 */
export async function generateSchedulerImage(params: {
  organizationId: string;
  prompt: string;
  size?: GenerateSchedulerImageSize;
  model?: GenerateSchedulerImageModel;
}): Promise<GenerateSchedulerImageResult> {
  if (!isOpenAIConfigured()) {
    return { ok: false, error: "OpenAI is not configured (missing OPENAI_API_KEY).", status: 503 };
  }

  const prompt = params.prompt.trim();
  if (prompt.length < 3) {
    return { ok: false, error: "Prompt must be at least 3 characters.", status: 400 };
  }
  if (prompt.length > 4000) {
    return { ok: false, error: "Prompt must be at most 4000 characters.", status: 400 };
  }

  const allowed = await checkAIRateLimit(params.organizationId);
  if (!allowed) {
    return { ok: false, error: "AI rate limit reached. Try again in about an hour.", status: 429 };
  }

  const openai = getOpenAI();
  if (!openai) {
    return { ok: false, error: "OpenAI client unavailable.", status: 503 };
  }

  const model = params.model ?? "dall-e-3";
  const size =
    model === "dall-e-2" ? "1024x1024" : (params.size ?? "1024x1024");

  try {
    const img = await openai.images.generate({
      model,
      prompt,
      n: 1,
      size,
      ...(model === "dall-e-3" ? { quality: "standard" as const } : {}),
      response_format: "url",
    });

    const remoteUrl = img.data?.[0]?.url;
    if (!remoteUrl) {
      return { ok: false, error: "No image URL returned from OpenAI.", status: 502 };
    }

    const fetchRes = await fetch(remoteUrl);
    if (!fetchRes.ok) {
      return { ok: false, error: "Could not download generated image.", status: 502 };
    }

    const buf = Buffer.from(await fetchRes.arrayBuffer());
    if (buf.length > 25 * 1024 * 1024) {
      return { ok: false, error: "Generated image too large.", status: 502 };
    }

    const publicDir = join(process.cwd(), "public", "uploads", "scheduler-media");
    await mkdir(publicDir, { recursive: true });
    const filename = `${params.organizationId}-ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    await writeFile(join(publicDir, filename), buf);

    const url = `/uploads/scheduler-media/${filename}`;
    const cost = Number(process.env.OPENAI_IMAGE_COST_USD ?? DALLE3_STD_1024_COST_USD);
    await logAIUsage(params.organizationId, "image_generation", 0, 0, {
      estimatedCostUSD: Number.isFinite(cost) ? cost : DALLE3_STD_1024_COST_USD,
    });

    return { ok: true, url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Image generation failed";
    console.error("[ai] generateSchedulerImage", e);
    return { ok: false, error: msg, status: 502 };
  }
}
