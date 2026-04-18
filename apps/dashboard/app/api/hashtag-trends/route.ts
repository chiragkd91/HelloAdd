import { connectMongo, HashtagTrend } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";

const DEMO_ITEMS = [
  {
    id: "demo-h1",
    tag: "PerformanceMarketing",
    platforms: ["FACEBOOK", "INSTAGRAM", "GOOGLE"],
    heatScore: 94,
    momentum: "Hot",
    context: "Demo — seed DB for live hashtag trends.",
    category: "Marketing",
    sourceName: "Google Ads",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-h2",
    tag: "ShortFormVideo",
    platforms: ["INSTAGRAM", "YOUTUBE"],
    heatScore: 92,
    momentum: "Hot",
    context: "Demo — vertical creative and Reels/Shorts momentum.",
    category: "Creative",
    sourceName: "Meta Business",
    updatedAt: new Date().toISOString(),
  },
];

function serialize(doc: {
  _id: string;
  tag: string;
  platforms: string[];
  heatScore: number;
  momentum: string;
  context: string;
  category?: string;
  sourceName?: string;
  updatedAt: Date;
}) {
  return {
    id: doc._id,
    tag: doc.tag,
    platforms: doc.platforms ?? [],
    heatScore: doc.heatScore,
    momentum: doc.momentum,
    context: doc.context ?? "",
    category: doc.category ?? "",
    sourceName: doc.sourceName?.trim() || "Industry note",
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

/**
 * GET /api/hashtag-trends?platform=INSTAGRAM&sourceName=Meta+Business&limit=20
 * Hashtags aligned to the same “market source” labels as Market pulse (`market_trends.sourceName`).
 */
export async function GET(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 24), 50);
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

    let items = await HashtagTrend.find(q)
      .sort({ sourceName: 1, heatScore: -1, updatedAt: -1 })
      .limit(limit)
      .lean();

    if (platform && items.length === 0 && !sourceName) {
      items = await HashtagTrend.find({})
        .sort({ sourceName: 1, heatScore: -1, updatedAt: -1 })
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
