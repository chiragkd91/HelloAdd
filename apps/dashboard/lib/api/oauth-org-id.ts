/** OAuth state carries `organizationId` (workspace receiving the integration). Supports CUID2 and legacy ObjectId-shaped ids. */
export function isValidOAuthOrganizationId(id: string): boolean {
  if (typeof id !== "string") return false;
  if (id.length < 12 || id.length > 64) return false;
  return /^[a-z0-9_-]+$/i.test(id);
}
