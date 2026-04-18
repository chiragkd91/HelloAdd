import {
  AgencyClientRelation,
  Organization,
  connectMongo,
  type AgencyClientRelationAttrs,
  type OrganizationAttrs,
} from "@helloadd/database";

export type AgencyClientBundle = {
  relation: AgencyClientRelationAttrs;
  organization: OrganizationAttrs;
};

export async function loadAgencyClient(
  agencyOrgId: string,
  clientOrgId: string,
): Promise<AgencyClientBundle | null> {
  await connectMongo();
  const rel = await AgencyClientRelation.findOne({ agencyOrgId, clientOrgId }).lean();
  if (!rel) return null;
  const organization = await Organization.findById(clientOrgId).lean();
  if (!organization) return null;
  return { relation: rel as AgencyClientRelationAttrs, organization };
}
