import type { Platform } from "@helloadd/database";

export type OAuthStubState = {
  organizationId: string;
  platform: Platform;
  provider: "meta" | "google" | "linkedin";
  csrf: string;
  /** Post-auth redirect pathname. Only set from known connect routes. */
  next?: string;
};

export function encodeState(s: OAuthStubState): string {
  return Buffer.from(JSON.stringify(s), "utf8").toString("base64url");
}

export function decodeState(raw: string | null): OAuthStubState | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OAuthStubState;
    if (!j.organizationId || !j.platform || !j.provider || !j.csrf) return null;
    if (j.next != null && typeof j.next !== "string") return null;
    return j;
  } catch {
    return null;
  }
}
