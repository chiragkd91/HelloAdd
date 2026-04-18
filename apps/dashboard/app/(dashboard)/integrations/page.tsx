"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { platformColors } from "@/lib/platformColors";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type ApiIntegration = {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  isActive: boolean;
  connectedAt: string;
};

type Platform =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "GOOGLE"
  | "LINKEDIN"
  | "YOUTUBE"
  | "TWITTER"
  | "WHATSAPP";

type Slot = {
  id: string;
  name: string;
  description: string;
  /** Match API `platform` enum values */
  matchPlatforms: string[];
  connectHref: string | null;
  /** OAuth redirect vs in-app form (e.g. WhatsApp Cloud credentials). */
  connectMode?: "oauth" | "modal";
  /** When not connected and not "soon" */
  defaultMode: "available" | "soon";
  accent: string;
};

const SLOTS: Slot[] = [
  {
    id: "meta",
    name: "Meta (Facebook + Instagram)",
    description: "Campaigns, ad sets, creatives, and insights for Meta properties.",
    matchPlatforms: ["FACEBOOK", "INSTAGRAM"],
    connectHref: "/api/integrations/meta/connect",
    defaultMode: "available",
    accent: platformColors.Facebook ?? "#1877F2",
  },
  {
    id: "google",
    name: "Google Ads",
    description: "Search, Performance Max, and YouTube line items with conversion data.",
    matchPlatforms: ["GOOGLE"],
    connectHref: "/api/integrations/google/connect",
    defaultMode: "available",
    accent: platformColors.Google ?? "#4285F4",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Sponsored content and lead gen forms for B2B audiences.",
    matchPlatforms: ["LINKEDIN"],
    connectHref: "/api/integrations/linkedin/connect",
    defaultMode: "available",
    accent: platformColors.LinkedIn ?? "#0A66C2",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description:
      "Cloud API for team alert notifications. Add your Meta Phone Number ID and permanent token — used for critical alerts (Settings → Alerts still sets the destination number).",
    matchPlatforms: ["WHATSAPP"],
    connectHref: null,
    connectMode: "modal",
    defaultMode: "available",
    accent: platformColors.WHATSAPP ?? "#25D366",
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Video and Brand Lift via your Google Ads account (same OAuth as Google).",
    matchPlatforms: ["YOUTUBE", "GOOGLE"],
    connectHref: "/api/integrations/youtube/connect",
    defaultMode: "available",
    accent: platformColors.YouTube ?? "#FF0000",
  },
  {
    id: "twitter",
    name: "Twitter / X",
    description: "Promoted posts and engagement campaigns.",
    matchPlatforms: ["TWITTER"],
    connectHref: null,
    defaultMode: "soon",
    accent: "#000000",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Sync catalog, orders, and pixel events for attribution.",
    matchPlatforms: [],
    connectHref: null,
    defaultMode: "soon",
    accent: "#96BF48",
  },
];

const DEMO_FALLBACK: { account?: string; lastSync?: string }[] = [
  { account: "Acme Business Manager", lastSync: "12 min ago" },
  { account: "ads@acme.org · 834-221-9911", lastSync: "28 min ago" },
  { account: "Acme Marketing Page", lastSync: "1h ago" },
];

function formatRelative(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function findIntegration(items: ApiIntegration[], slot: Slot) {
  return items.find((i) => i.isActive && slot.matchPlatforms.includes(i.platform));
}

function syncPlatformForSlot(slot: Slot): Platform | null {
  if (slot.id === "meta") return "FACEBOOK";
  if (slot.id === "youtube") return "GOOGLE";
  if (slot.id === "google") return "GOOGLE";
  if (slot.id === "linkedin") return "LINKEDIN";
  if (slot.id === "whatsapp") return "WHATSAPP";
  return null;
}

type BannerMessage = {
  variant: "success" | "warning" | "error";
  title: string;
  body?: string;
};

function messageFromOAuthQuery(connected: string | null, error: string | null): BannerMessage | null {
  if (connected) {
    const labels: Record<string, string> = {
      facebook: "Meta (Facebook / Instagram)",
      google: "Google Ads",
      linkedin: "LinkedIn",
    };
    const name = labels[connected] ?? connected;
    return {
      variant: "success",
      title: `${name} connected`,
      body: "Your account is linked. Initial sync runs in the background — open Campaigns in a minute to see data.",
    };
  }
  if (!error) return null;

  const soft: Record<string, { title: string; body?: string }> = {
    facebook_denied: {
      title: "Meta sign-in was cancelled",
      body: "Nothing was saved. Use Connect when you’re ready to try again.",
    },
    google_denied: {
      title: "Google sign-in was cancelled",
      body: "Nothing was saved.",
    },
    linkedin_denied: {
      title: "LinkedIn sign-in was cancelled",
      body: "Nothing was saved.",
    },
    no_ad_account: {
      title: "No Meta ad account found",
      body: "This Facebook user needs access to at least one ad account in Business settings, then try Connect again.",
    },
    agency_plan_platform: {
      title: "Not included in your agency plan",
      body: "This platform isn’t allowed for your workspace under the plan your agency assigned. Ask them to update the plan if you need it.",
    },
    agency_plan_social_limit: {
      title: "Social account limit reached",
      body: "Your plan allows a limited number of connected accounts. Disconnect one or ask your agency for a higher limit.",
    },
  };

  const hard: Record<string, { title: string; body?: string }> = {
    meta_oauth: {
      title: "Meta connection failed",
      body: "Confirm META_APP_ID / META_APP_SECRET and that the redirect URI matches your app settings.",
    },
    google_oauth: {
      title: "Google Ads connection failed",
      body: "Check OAuth client credentials, consent screen, and Google Ads API access.",
    },
    linkedin_oauth: {
      title: "LinkedIn connection failed",
      body: "Check LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET and the redirect URL in LinkedIn developers.",
    },
  };

  if (soft[error]) {
    return { variant: "warning", title: soft[error].title, body: soft[error].body };
  }
  if (hard[error]) {
    return { variant: "error", title: hard[error].title, body: hard[error].body };
  }
  return {
    variant: "warning",
    title: "Connection didn’t finish",
    body: `Something went wrong (code: ${error}). Try again or contact support if it persists.`,
  };
}

function OAuthReturnBannerInner() {
  const searchParams = useSearchParams();
  const msg = messageFromOAuthQuery(searchParams.get("connected"), searchParams.get("error"));
  if (!msg) return null;

  const box =
    msg.variant === "success"
      ? "border-primary/30 bg-primary/5 text-neutral-800"
      : msg.variant === "error"
        ? "border-red-200 bg-red-50/90 text-red-950"
        : "border-amber-200 bg-amber-50/80 text-amber-950";

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${box}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">{msg.title}</p>
      {msg.body && (
        <p
          className={`mt-1 ${
            msg.variant === "error"
              ? "text-red-900"
              : msg.variant === "success"
                ? "text-neutral-600"
                : "text-amber-900"
          }`}
        >
          {msg.body}
        </p>
      )}
    </div>
  );
}

/** Reads `?connected=` / `?error=` from OAuth redirects; must be under Suspense (useSearchParams). */
function OAuthReturnBanner() {
  return (
    <Suspense fallback={null}>
      <OAuthReturnBannerInner />
    </Suspense>
  );
}

type ConnectPrompt =
  | null
  | { mode: "signin" }
  | { mode: "oauth"; href: string; platformName: string };

export default function IntegrationsPage() {
  const { status: authStatus, user: authUser } = useAuth();
  const [items, setItems] = useState<ApiIntegration[] | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "unauthenticated" | "error">("loading");
  const [connectPrompt, setConnectPrompt] = useState<ConnectPrompt>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waSaving, setWaSaving] = useState(false);
  const [waDisconnecting, setWaDisconnecting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [syncingSlotId, setSyncingSlotId] = useState<string | null>(null);

  const hasHelloAddSession = authStatus === "authenticated" && Boolean(authUser);
  /** API returned 401 for /api/integrations — session cookie missing or invalid. */
  const integrationsUnauthorized = loadState === "unauthenticated";

  const loadIntegrations = useCallback(async () => {
    const r = await fetch("/api/integrations", { credentials: "include", cache: "no-store" });
    if (r.status === 401) {
      setLoadState("unauthenticated");
      return;
    }
    if (!r.ok) {
      setLoadState("error");
      return;
    }
    const j = (await r.json()) as { items: ApiIntegration[] };
    setItems(j.items ?? []);
    setLoadState("ok");
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadIntegrations().catch(() => {
      if (!cancelled) setLoadState("error");
    });
    return () => {
      cancelled = true;
    };
  }, [loadIntegrations]);

  async function submitWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    const phoneNumberId = waPhone.trim();
    const accessToken = waToken.trim();
    if (!phoneNumberId || !accessToken) {
      toast.error("Enter Phone Number ID and access token.");
      return;
    }
    setWaSaving(true);
    try {
      const r = await fetch("/api/integrations/whatsapp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId, accessToken }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not connect WhatsApp");
        return;
      }
      toast.success("WhatsApp Business connected.");
      setWaOpen(false);
      setWaPhone("");
      setWaToken("");
      await loadIntegrations();
    } catch {
      toast.error("Network error");
    } finally {
      setWaSaving(false);
    }
  }

  function openConnectModal(slot: Slot) {
    if (!slot.connectHref) return;
    if (authStatus === "loading" || loadState === "loading") {
      toast.error("Checking your session… try again in a moment.");
      return;
    }
    if (!hasHelloAddSession || integrationsUnauthorized) {
      setConnectPrompt({ mode: "signin" });
      return;
    }
    setConnectPrompt({
      mode: "oauth",
      href: slot.connectHref,
      platformName: slot.name,
    });
  }

  function openWhatsAppModal() {
    if (authStatus === "loading" || loadState === "loading") {
      toast.error("Checking your session… try again in a moment.");
      return;
    }
    if (!hasHelloAddSession || integrationsUnauthorized) {
      setConnectPrompt({ mode: "signin" });
      return;
    }
    setWaOpen(true);
  }

  function confirmOAuthRedirect() {
    if (connectPrompt?.mode !== "oauth") return;
    const href = connectPrompt.href;
    setConnectPrompt(null);
    window.location.assign(href);
  }

  async function disconnectWhatsApp() {
    setWaDisconnecting(true);
    try {
      const r = await fetch("/api/integrations/whatsapp", { method: "DELETE", credentials: "include" });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not disconnect");
        return;
      }
      toast.success("WhatsApp disconnected.");
      await loadIntegrations();
    } catch {
      toast.error("Network error");
    } finally {
      setWaDisconnecting(false);
    }
  }

  async function disconnectIntegration(integrationId: string) {
    setDisconnectingId(integrationId);
    try {
      const r = await fetch(`/api/integrations/${integrationId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not disconnect");
        return;
      }
      toast.success("Integration disconnected.");
      await loadIntegrations();
    } catch {
      toast.error("Network error");
    } finally {
      setDisconnectingId(null);
    }
  }

  async function syncIntegration(slot: Slot) {
    const platform = syncPlatformForSlot(slot);
    if (!platform) return;
    setSyncingSlotId(slot.id);
    try {
      const r = await fetch("/api/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const j = (await r.json().catch(() => ({}))) as { synced?: number; error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Sync failed");
        return;
      }
      toast.success(`Synced ${j.synced ?? 0} campaign(s).`);
      await loadIntegrations();
    } catch {
      toast.error("Network error");
    } finally {
      setSyncingSlotId(null);
    }
  }

  const merged = useMemo(() => {
    return SLOTS.map((slot, idx) => {
      const fromApi = items ? findIntegration(items, slot) : undefined;
      const demo = DEMO_FALLBACK[idx];

      if (fromApi) {
        return {
          slot,
          status: "connected" as const,
          integrationId: fromApi.id,
          integrationPlatform: fromApi.platform,
          account: fromApi.accountName,
          lastSync: formatRelative(fromApi.connectedAt),
        };
      }

      if (loadState === "unauthenticated" || loadState === "error") {
        if (slot.defaultMode === "soon") {
          return { slot, status: "soon" as const };
        }
        if (demo && idx < 3) {
          return {
            slot,
            status: "connected" as const,
            account: demo.account,
            lastSync: demo.lastSync,
            isDemo: true,
          };
        }
      }

      if (slot.defaultMode === "soon") {
        return { slot, status: "soon" as const };
      }

      return { slot, status: "available" as const };
    });
  }, [items, loadState]);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Integrations</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Connect ad platforms with OAuth. Use <strong className="font-semibold text-neutral-800">Connect</strong> to run
          the stub flow; live tokens are stored in MongoDB after callback.
        </p>
      </div>

      <OAuthReturnBanner />

      {loadState === "loading" && (
        <p className="text-sm text-neutral-600" aria-live="polite">
          Loading connections…
        </p>
      )}

      {loadState === "unauthenticated" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          You&apos;re not signed in — showing sample cards.{" "}
          <Link href="/login" className="font-semibold text-primary underline">
            Sign in
          </Link>{" "}
          to load integrations from the API.
        </div>
      )}

      {loadState === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-900">
          Could not reach the API. Ensure MongoDB is running locally (e.g.{" "}
          <code className="rounded bg-white/80 px-1">127.0.0.1:27017</code>) or set{" "}
          <code className="rounded bg-white/80 px-1">MONGODB_URI</code>.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {merged.map((row) => {
          const c = row.slot;
          const status = row.status;
          const isDemo = "isDemo" in row && row.isDemo;

          return (
            <article
              key={c.id}
              className="flex min-h-[200px] flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <span
                    className="mt-0.5 h-10 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: c.accent }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-neutral-900">{c.name}</h2>
                    <p className="mt-2 text-sm text-neutral-600">{c.description}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                    status === "connected"
                      ? "bg-primary/15 text-primary"
                      : status === "available"
                        ? "bg-neutral-100 text-neutral-700"
                        : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {status === "connected" ? "Connected" : status === "available" ? "Ready" : "Coming soon"}
                </span>
              </div>

              {status === "connected" && "account" in row && row.account && (
                <p className="mt-3 text-xs text-neutral-600">
                  Account: <span className="font-medium text-neutral-800">{row.account}</span>
                  {c.id === "whatsapp" ? (
                    <span> · WhatsApp Cloud API ready for team alerts</span>
                  ) : (
                    "lastSync" in row &&
                    row.lastSync && (
                      <>
                        {" "}
                        · Last sync {row.lastSync}
                        {isDemo && (
                          <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-600">
                            demo
                          </span>
                        )}
                      </>
                    )
                  )}
                </p>
              )}

              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {status === "connected" && c.id === "whatsapp" && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    disabled={waDisconnecting}
                    onClick={() => void disconnectWhatsApp()}
                  >
                    {waDisconnecting ? "Disconnecting…" : "Disconnect"}
                  </Button>
                )}
                {status === "connected" && c.id !== "whatsapp" && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs"
                      disabled={syncingSlotId === c.id}
                      onClick={() => void syncIntegration(c)}
                    >
                      {syncingSlotId === c.id ? "Syncing…" : "Sync now"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-xs"
                      disabled={!("integrationId" in row) || disconnectingId === row.integrationId}
                      onClick={() => {
                        if ("integrationId" in row && row.integrationId) void disconnectIntegration(row.integrationId);
                      }}
                    >
                      {"integrationId" in row && disconnectingId === row.integrationId ? "Disconnecting…" : "Disconnect"}
                    </Button>
                  </>
                )}
                {status === "available" && c.connectMode === "modal" && (
                  <Button
                    type="button"
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-hover"
                    onClick={() => openWhatsAppModal()}
                  >
                    Connect
                  </Button>
                )}
                {status === "available" && c.connectHref && (
                  <Button
                    type="button"
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-hover"
                    onClick={() => openConnectModal(c)}
                  >
                    Connect
                  </Button>
                )}
                {status === "soon" && (
                  <Button type="button" variant="secondary" disabled className="text-xs">
                    Notify me
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-xs text-neutral-600">
        Ad platforms use OAuth. WhatsApp uses your Phone Number ID and token from Meta.
      </p>

      <Modal
        open={connectPrompt?.mode === "signin"}
        onClose={() => setConnectPrompt(null)}
        title="Sign in required"
      >
        <p className="text-sm text-neutral-600">
          Connect integrations with your Hello Add account. Sign in, then return here to authorize Meta, Google, or
          LinkedIn.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setConnectPrompt(null)}>
            Cancel
          </Button>
          <Link
            href="/login?next=%2Fintegrations"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-hover"
          >
            Sign in
          </Link>
        </div>
      </Modal>

      <Modal
        open={connectPrompt?.mode === "oauth"}
        onClose={() => setConnectPrompt(null)}
        title={connectPrompt?.mode === "oauth" ? `Connect ${connectPrompt.platformName}` : "Connect"}
      >
        {connectPrompt?.mode === "oauth" && (
          <>
            <p className="text-sm text-neutral-600">
              You&apos;re signed in to Hello Add as{" "}
              <strong className="text-neutral-900">{authUser?.email ?? authUser?.name ?? "your account"}</strong>.
              The next step opens the provider&apos;s secure page so you can authorize ad access for this workspace.
            </p>
            {loadState === "error" && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
                Integration list couldn&apos;t be loaded (e.g. database unreachable). You can still continue if your
                session is valid.
              </p>
            )}
            <ul className="mt-3 list-inside list-disc text-xs text-neutral-600">
              <li>Use the ad account / Business Manager login that should manage this org&apos;s campaigns.</li>
              <li>You can cancel on the provider&apos;s screen — nothing is saved until you finish.</li>
            </ul>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConnectPrompt(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => confirmOAuthRedirect()}>
                Continue to provider
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={waOpen} onClose={() => !waSaving && setWaOpen(false)} title="Connect WhatsApp Business">
        <form onSubmit={submitWhatsApp} className="space-y-4">
          <p className="text-sm text-neutral-600">
            In Meta Business Suite → WhatsApp → API setup, copy your <strong>Phone number ID</strong> and a{" "}
            <strong>permanent access token</strong>. We call the Graph API to verify before saving (server-side only).
          </p>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Phone number ID
            <input
              required
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              placeholder="Digits from Meta (e.g. 123456789012345)"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Permanent access token
            <input
              required
              type="password"
              className="rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm text-neutral-900"
              value={waToken}
              onChange={(e) => setWaToken(e.target.value)}
              placeholder="System user or permanent token"
              autoComplete="off"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" disabled={waSaving} onClick={() => setWaOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={waSaving}>
              {waSaving ? "Verifying…" : "Connect"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
