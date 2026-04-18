import { connectMongo, MarketTrend } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";

/** Fallback when Mongo is unavailable or collection is empty. */
const DEMO_ITEMS = [
  {
    id: "demo-1",
    title: "Google AI Max and demand-gen tools",
    summary:
      "Google continues to push AI-assisted campaign setup and Performance Max — worth testing if you still run siloed Search-only accounts.",
    url: "https://blog.google/products/ads/",
    sourceName: "Google Ads",
    platforms: ["GOOGLE", "YOUTUBE"],
    industries: ["SaaS", "E‑commerce"],
    relevanceScore: 88,
    publishedAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    title: "Short-form video still leads social engagement",
    summary:
      "Across Meta surfaces, short vertical creative often outperforms static for prospecting; refresh hooks every 2–3 weeks.",
    url: "https://www.facebook.com/business/news",
    sourceName: "Meta Business",
    platforms: ["FACEBOOK", "INSTAGRAM"],
    industries: ["Retail", "D2C"],
    relevanceScore: 85,
    publishedAt: new Date().toISOString(),
  },
];

function serialize(doc: {
  _id: string;
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  platforms: string[];
  industries: string[];
  relevanceScore: number;
  publishedAt: Date;
}) {
  return {
    id: doc._id,
    title: doc.title,
    summary: doc.summary,
    url: doc.url,
    sourceName: doc.sourceName,
    platforms: doc.platforms ?? [],
    industries: doc.industries ?? [],
    relevanceScore: doc.relevanceScore,
    publishedAt: doc.publishedAt instanceof Date ? doc.publishedAt.toISOString() : String(doc.publishedAt),
  };
}

/**
 * GET /api/market-trends?platform=GOOGLE&sourceName=Google+Ads&limit=10
 * Editorial / market signals — optional filter by `sourceName` (same as hashtag market source).
 */
export async function GET(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 12), 50);
  const platform = searchParams.get("platform")?.toUpperCase();
  const sourceName = searchParams.get("sourceName")?.trim();

  try {
    await connectMongo();

    const q: Record<string, unknown> = {};
    if (platform) {
      q.$or = [{ platforms: { $size: 0 } }, { platforms: platform }];
    }
    if (sourceName) {
      q.sourceName = sourceName;
    }

    let items = await MarketTrend.find(q).sort({ sourceName: 1, relevanceScore: -1, publishedAt: -1 }).limit(limit).lean();

    if (platform && items.length === 0 && !sourceName) {
      items = await MarketTrend.find({})
        .sort({ sourceName: 1, relevanceScore: -1, publishedAt: -1 })
        .limit(limit)
        .lean();
    }

    if (items.length === 0) {
      return jsonOk({ items: DEMO_ITEMS, source: "demo" as const });
    }

    return jsonOk({
      items: items.map((d) => serialize(d as Parameters<typeof serialize>[0])),
      source: "database" as const,
    });
  } catch {
    return jsonOk({ items: DEMO_ITEMS, source: "demo" as const, degraded: true });
  }
}
