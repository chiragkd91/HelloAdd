import { createHash, randomBytes } from "crypto";

export function generateInviteSecret(): string {
  return randomBytes(32).toString("hex");
}

export function hashInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}
