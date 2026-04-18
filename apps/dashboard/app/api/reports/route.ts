import { Report } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";

export async function GET(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 40), 100);

  const items = await Report.find({ organizationId: auth.organizationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return jsonOk({
    items: items.map((r) => ({
      id: r._id,
      reportType: r.reportType,
      status: r.status,
      dateFrom: r.dateFrom ? r.dateFrom.toISOString() : null,
      dateTo: r.dateTo ? r.dateTo.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      errorMessage: r.errorMessage ?? null,
    })),
  });
}
