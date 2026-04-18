import { Integration } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";

function sanitize(i: {
  _id: string;
  organizationId: string;
  platform: string;
  accountId: string;
  accountName: string;
  isActive: boolean;
  connectedAt: Date;
  tokenExpiresAt?: Date | null;
}) {
  return {
    id: i._id,
    organizationId: i.organizationId,
    platform: i.platform,
    accountId: i.accountId,
    accountName: i.accountName,
    isActive: i.isActive,
    connectedAt: i.connectedAt.toISOString(),
    tokenExpiresAt: i.tokenExpiresAt ? i.tokenExpiresAt.toISOString() : null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  const items = await Integration.find({ organizationId: auth.organizationId }).sort({ connectedAt: -1 }).lean();

  return jsonOk({
    items: items.map((i) => sanitize(i as Parameters<typeof sanitize>[0])),
  });
}
