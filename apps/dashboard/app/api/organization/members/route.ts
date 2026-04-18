import { connectMongo, OrganizationMember, User } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonDbUnavailable, jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";

export async function GET(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const rows = await OrganizationMember.find({ organizationId: auth.organizationId }).lean();
  const userIds = rows.map((r) => r.userId);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const byId = Object.fromEntries(users.map((u) => [u._id, u]));

  const members = rows.map((m) => {
    const u = byId[m.userId];
    return {
      memberId: m._id,
      userId: m.userId,
      role: m.role,
      name: u?.name ?? "Unknown",
      email: u?.email ?? "",
    };
  });

  const self = rows.find((r) => r.userId === auth.user._id);

  return jsonOk({
    members,
    myMemberId: self?._id ?? null,
    myRole: self?.role ?? null,
  });
}
