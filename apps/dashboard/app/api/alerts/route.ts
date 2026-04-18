import { Alert, Campaign } from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";

const patchSchema = z.object({
  alertId: z.string().min(1),
  isRead: z.boolean(),
});

export async function GET(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);

  if (searchParams.get("count") === "1") {
    const [unread, total] = await Promise.all([
      Alert.countDocuments({ organizationId: auth.organizationId, isRead: false }),
      Alert.countDocuments({ organizationId: auth.organizationId }),
    ]);
    return jsonOk({ unread, total });
  }

  const unreadOnly = searchParams.get("unread") === "1";
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 200)));

  const q: Record<string, unknown> = { organizationId: auth.organizationId };
  if (unreadOnly) q.isRead = false;

  const items = await Alert.find(q).sort({ createdAt: -1 }).limit(limit).lean();

  const campaignIds = [...new Set(items.map((a) => a.campaignId).filter(Boolean))] as string[];
  const campaigns =
    campaignIds.length > 0
      ? await Campaign.find({ _id: { $in: campaignIds } })
          .select(["name", "platform"])
          .lean()
      : [];
  const cmap = Object.fromEntries(
    campaigns.map((c) => [c._id, { name: c.name, platform: c.platform as string }])
  );

  return jsonOk({
    items: items.map((a) => ({
      id: a._id,
      organizationId: a.organizationId,
      type: a.type,
      title: a.title,
      message: a.message,
      isRead: a.isRead,
      severity: a.severity,
      campaignId: a.campaignId ?? null,
      createdAt: a.createdAt.toISOString(),
      campaignName: a.campaignId ? (cmap[a.campaignId]?.name ?? null) : null,
      platform: a.campaignId ? (cmap[a.campaignId]?.platform ?? null) : null,
      aiExplanation: a.aiExplanation ?? null,
      aiFixSteps: Array.isArray(a.aiFixSteps) ? a.aiFixSteps : null,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const r = await Alert.findOneAndUpdate(
    {
      _id: parsed.data.alertId,
      organizationId: auth.organizationId,
    },
    { $set: { isRead: parsed.data.isRead } },
    { new: true }
  ).lean();

  if (!r) {
    return jsonError("Alert not found", 404);
  }

  return jsonOk({
    id: r._id,
    isRead: r.isRead,
  });
}
