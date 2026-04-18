import { ScheduledPost, type ScheduledPostAttrs } from "@helloadd/database";
import { NextRequest } from "next/server";
import { formatDateKeyInTimeZone, isValidIanaTimeZone } from "@/lib/calendarLocalDate";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";

export async function GET(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  if (!Number.isInteger(month) || !Number.isInteger(year) || month < 1 || month > 12) {
    return jsonError("Invalid month/year", 400);
  }

  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const timeZoneRaw = searchParams.get("timeZone") ?? "UTC";
  const timeZone = isValidIanaTimeZone(timeZoneRaw) ? timeZoneRaw : "UTC";

  const hasLocalRange =
    typeof fromStr === "string" &&
    typeof toStr === "string" &&
    !Number.isNaN(Date.parse(fromStr)) &&
    !Number.isNaN(Date.parse(toStr));

  let start: Date;
  let end: Date;
  let grouping: "utc_day" | "time_zone_day";

  if (hasLocalRange) {
    start = new Date(fromStr);
    end = new Date(toStr);
    if (start >= end) {
      return jsonError("Invalid from/to range", 400);
    }
    grouping = "time_zone_day";
  } else {
    start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    grouping = "utc_day";
  }

  const posts = await ScheduledPost.find({
    organizationId: auth.organizationId,
    platforms: {
      $elemMatch: {
        scheduledAt: { $gte: start, $lt: end },
      },
    },
  })
    .sort({ "platforms.scheduledAt": 1 })
    .lean();

  const grouped: Record<
    string,
    Array<{
      postId: string;
      content: string;
      platform: string;
      status: string;
      scheduledAt: string;
    }>
  > = {};

  for (const post of posts as ScheduledPostAttrs[]) {
    for (const platformConfig of post.platforms) {
      if (platformConfig.scheduledAt < start || platformConfig.scheduledAt >= end) continue;
      const at = new Date(platformConfig.scheduledAt);
      const day =
        grouping === "time_zone_day"
          ? formatDateKeyInTimeZone(at, timeZone)
          : at.toISOString().slice(0, 10);
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push({
        postId: post._id,
        content: post.content,
        platform: platformConfig.platform,
        status: platformConfig.status,
        scheduledAt: at.toISOString(),
      });
    }
  }

  return jsonOk({
    month,
    year,
    days: grouped,
    timeZone: grouping === "time_zone_day" ? timeZone : "UTC",
    range: { from: start.toISOString(), to: end.toISOString() },
  });
}
