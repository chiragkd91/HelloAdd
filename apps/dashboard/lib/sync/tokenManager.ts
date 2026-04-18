/**
 * Token refresh before platform API calls (Group 2 — Task 2.4).
 * If access token expires within the buffer window, refresh (or exchange for Meta).
 * On refresh failure: deactivate integration and create an Alert.
 */
import {
  Alert,
  connectMongo,
  Integration,
  type IntegrationAttrs,
} from "@helloadd/database";
import { refreshMetaToken } from "@/lib/api/meta";
import { refreshGoogleAccessToken } from "@/lib/api/google";
import { refreshLinkedInAccessToken } from "@/lib/api/linkedin";

/** Refresh when expiry is within this window (Group 2: within 10 minutes of expiry). */
export const TOKEN_REFRESH_BUFFER_MS = 10 * 60 * 1000;

export type LiveIntegration = IntegrationAttrs & { _id: string };

/** Called when sync APIs return auth errors (separate from refresh failures). */
export async function deactivateIntegration(
  integrationId: string,
  organizationId: string,
  platform: string,
  message: string
): Promise<void> {
  await Integration.findByIdAndUpdate(integrationId, { $set: { isActive: false } });
  await Alert.create({
    organizationId,
    type: "CAMPAIGN_ERROR",
    title: `${platform} connection issue`,
    message,
    severity: "WARNING",
    isRead: false,
  });
}

/**
 * Returns a usable access token for this integration row, refreshing when near expiry.
 */
export async function ensureFreshAccessToken(
  doc: LiveIntegration,
  errors: string[]
): Promise<{ accessToken: string; tokenExpiresAt: Date | null } | null> {
  if (doc.accessToken.startsWith("oauth_stub_")) {
    errors.push(`${doc.platform}: stub OAuth token — connect a real account to sync.`);
    return null;
  }

  const exp = doc.tokenExpiresAt ? new Date(doc.tokenExpiresAt).getTime() : null;
  const expiringSoon = exp != null && exp - Date.now() < TOKEN_REFRESH_BUFFER_MS;

  if (doc.platform === "GOOGLE" && expiringSoon && doc.refreshToken) {
    try {
      const t = await refreshGoogleAccessToken(doc.refreshToken);
      await Integration.findByIdAndUpdate(doc._id, {
        $set: {
          accessToken: t.accessToken,
          refreshToken: t.refreshToken,
          tokenExpiresAt: t.expiresAt,
        },
      });
      return { accessToken: t.accessToken, tokenExpiresAt: t.expiresAt };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`GOOGLE: token refresh failed (${msg})`);
      await deactivateIntegration(doc._id, doc.organizationId, "Google Ads", msg);
      return null;
    }
  }

  if (doc.platform === "LINKEDIN" && expiringSoon && doc.refreshToken) {
    try {
      const t = await refreshLinkedInAccessToken(doc.refreshToken);
      await Integration.findByIdAndUpdate(doc._id, {
        $set: {
          accessToken: t.accessToken,
          refreshToken: t.refreshToken,
          tokenExpiresAt: t.expiresAt,
        },
      });
      return { accessToken: t.accessToken, tokenExpiresAt: t.expiresAt };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`LINKEDIN: token refresh failed (${msg})`);
      await deactivateIntegration(doc._id, doc.organizationId, "LinkedIn", msg);
      return null;
    }
  }

  if ((doc.platform === "FACEBOOK" || doc.platform === "INSTAGRAM") && expiringSoon) {
    try {
      const t = await refreshMetaToken(doc.accessToken);
      await Integration.findByIdAndUpdate(doc._id, {
        $set: {
          accessToken: t.accessToken,
          tokenExpiresAt: t.tokenExpiresAt,
        },
      });
      return { accessToken: t.accessToken, tokenExpiresAt: t.tokenExpiresAt };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${doc.platform}: Meta token refresh failed (${msg})`);
      await deactivateIntegration(doc._id, doc.organizationId, doc.platform, msg);
      return null;
    }
  }

  return {
    accessToken: doc.accessToken,
    tokenExpiresAt: doc.tokenExpiresAt ?? null,
  };
}

/**
 * Load integration by id and return a valid access token, or null if stub / refresh failed / inactive.
 */
export async function getValidToken(integrationId: string): Promise<string | null> {
  await connectMongo();
  const doc = (await Integration.findById(integrationId).lean()) as LiveIntegration | null;
  if (!doc || !doc.isActive) {
    return null;
  }
  const errors: string[] = [];
  const creds = await ensureFreshAccessToken(doc, errors);
  if (errors.length) {
    for (const line of errors) {
      console.warn("[getValidToken]", line);
    }
  }
  return creds?.accessToken ?? null;
}
