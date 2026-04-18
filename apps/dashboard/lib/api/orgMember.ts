import { OrganizationMember, connectMongo } from "@helloadd/database";
import type { OrgRole } from "@helloadd/database";

export async function getOrgMemberRole(
  userId: string,
  organizationId: string,
): Promise<OrgRole | null> {
  await connectMongo();
  const m = await OrganizationMember.findOne({ userId, organizationId }).lean();
  return (m?.role as OrgRole) ?? null;
}
