"use client";

import { Button } from "@/components/ui/Button";
import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { platformHex } from "@/lib/platformColors";
import type { Platform } from "@helloadd/database/enums";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type SanitizedIntegration = {
  id: string;
  platform: string;
  accountId: string;
  accountName: string;
  isActive: boolean;
  connectedAt: string;
  tokenExpiresAt: string | null;
  lastSyncedAt: string | null;
};

type CardRow = {
  platform: Platform;
  inPlan: boolean;
  status: "connected" | "pending" | "not_connected" | "unavailable";
  integration: SanitizedIntegration | null;
  hint: {
    state: string;
    manualAccountId: string | null;
    whatsappPhone: string | null;
    bsp: string | null;
  } | null;
};

const PLATFORM_COPY: Record<
  Platform,
  { title: string; blurb: string; connectNote?: string }
> = {
  FACEBOOK: {
    title: "Facebook",
    blurb: "Ad campaigns, lead forms, organic posts, Business Manager.",
  },
  INSTAGRAM: {
    title: "Instagram",
    blurb: "Connects through Facebook Business Manager — connect Facebook first.",
    connectNote: "Uses the same OAuth as Facebook.",
  },
  GOOGLE: {
    title: "Google Ads",
    blurb: "Search, Display, Performance Max — customer ID and conversions.",
  },
  LINKEDIN: {
    title: "LinkedIn",
    blurb: "Sponsored content and lead gen for B2B.",
  },
  YOUTUBE: {
    title: "YouTube",
    blurb: "Video campaigns use your Google Ads account — connect Google Ads first.",
    connectNote: "Same OAuth as Google Ads.",
  },
  TWITTER: {
    title: "Twitter / X",
    blurb: "Promoted posts and engagement (connector coming soon).",
  },
  WHATSAPP: {
    title: "WhatsApp Business",
    blurb: "Cloud API — alerts and messaging. Manual Phone Number ID + token, or BSP.",
  },
};

function syncPlatformForCard(platform: Platform): Platform {
  if (platform === "INSTAGRAM") return "FACEBOOK";
  if (platform === "YOUTUBE") return "GOOGLE";
  return platform;
}

function connectHref(clientId: string, platform: Platform): string | null {
  switch (platform) {
    case "FACEBOOK":
    case "INSTAGRAM":
      return `/api/agency/clients/${clientId}/connect/meta`;
    case "GOOGLE":
      return `/api/agency/clients/${clientId}/connect/google`;
    case "YOUTUBE":
      return `/api/agency/clients/${clientId}/connect/youtube`;
    case "LINKEDIN":
      return `/api/agency/clients/${clientId}/connect/linkedin`;
    default:
      return null;
  }
}

export default function AgencyClientIntegrationsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [planName, setPlanName] = useState<string | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [tokenWarnings, setTokenWarnings] = useState<
    Array<{ platform: Platform; integrationId: string; expiresAt: string; daysLeft: number }>
  >([]);
  const [syncing, setSyncing] = useState<Platform | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [integrationRemoveId, setIntegrationRemoveId] = useState<string | null>(null);
  const [whatsappRemoveOpen, setWhatsappRemoveOpen] = useState(false);
  const [waRemoveLoading, setWaRemoveLoading] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waSaving, setWaSaving] = useState(false);
  const [webhookBase, setWebhookBase] = useState("");

  useEffect(() => {
    if (!id) return;
    setWebhookBase(`${window.location.origin}/api/webhooks/whatsapp/${id}`);
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/agency/clients/${id}/integrations`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) {
        toast.error("Could not load integrations");
        return;
      }
      const j = (await r.json()) as {
        clientName?: string;
        planName?: string | null;
        cards?: CardRow[];
        tokenWarnings?: typeof tokenWarnings;
      };
      setClientName(j.clientName ?? "");
      setPlanName(j.planName ?? null);
      setCards(j.cards ?? []);
      setTokenWarnings(j.tokenWarnings ?? []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  /** OAuth return (?connected= / ?error=) — read URL in useEffect only (avoids useSearchParams hydration issues). */
  useEffect(() => {
    let search = window.location.search;
    const params = new URLSearchParams(search);
    const err = params.get("error");
    if (err) {
      const oauthErrors: Record<string, string> = {
        agency_plan_platform:
          "That platform isn’t included in this client’s agency plan. Update the plan or choose a different integration.",
        agency_plan_social_limit:
          "Social account limit for this client’s plan has been reached. Remove an integration or raise the limit on the plan.",
        facebook_denied: "Meta sign-in was cancelled.",
        google_denied: "Google sign-in was cancelled.",
        linkedin_denied: "LinkedIn sign-in was cancelled.",
        meta_oauth: "Meta connection failed. Check app credentials and redirect URI.",
        google_oauth: "Google connection failed. Check OAuth settings.",
        linkedin_oauth: "LinkedIn connection failed. Check app settings.",
        no_ad_account: "No Meta ad account found for this Facebook user.",
      };
      toast.error(oauthErrors[err] ?? `Connection issue (${err}). Try again or contact support.`);
      const u = new URL(window.location.href);
      u.searchParams.delete("error");
      window.history.replaceState({}, "", u.pathname + u.search);
      search = u.search;
    }
    const connected = new URLSearchParams(search).get("connected");
    if (!connected) return;
    toast.success(`Connected: ${connected}`);
    const u = new URL(window.location.href);
    u.searchParams.delete("connected");
    window.history.replaceState({}, "", u.pathname + u.search);
  }, []);

  async function runSync(platform: Platform) {
    setSyncing(platform);
    try {
      const p = syncPlatformForCard(platform);
      const r = await fetch(`/api/agency/clients/${id}/sync`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: p }),
      });
      const j = (await r.json().catch(() => ({}))) as { errors?: string[]; synced?: number; error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Sync failed");
        return;
      }
      toast.success(`Synced ${j.synced ?? 0} campaign(s)`);
      void load();
    } finally {
      setSyncing(null);
    }
  }

  async function confirmRemoveIntegration() {
    if (!integrationRemoveId) return;
    setRemoving(integrationRemoveId);
    try {
      const r = await fetch(`/api/agency/clients/${id}/integrations/${integrationRemoveId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not remove");
        return;
      }
      toast.success("Integration removed");
      setIntegrationRemoveId(null);
      void load();
    } finally {
      setRemoving(null);
    }
  }

  async function saveWhatsApp() {
    if (!waPhoneId.trim() || !waToken.trim()) {
      toast.error("Phone Number ID and access token are required");
      return;
    }
    setWaSaving(true);
    try {
      const r = await fetch(`/api/agency/clients/${id}/integrations/whatsapp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId: waPhoneId.trim(), accessToken: waToken.trim() }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not save");
        return;
      }
      toast.success("WhatsApp connected");
      setWaOpen(false);
      setWaPhoneId("");
      setWaToken("");
      void load();
    } finally {
      setWaSaving(false);
    }
  }

  async function confirmRemoveWhatsApp() {
    setWaRemoveLoading(true);
    try {
      const r = await fetch(`/api/agency/clients/${id}/integrations/whatsapp`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not remove");
        return;
      }
      toast.success("WhatsApp removed");
      setWhatsappRemoveOpen(false);
      void load();
    } finally {
      setWaRemoveLoading(false);
    }
  }

  if (!id) {
    return <p className="text-sm text-neutral-600">Invalid client.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/agency/clients/${id}`} className="text-sm font-semibold text-sky-800 hover:underline">
          ← {clientName || "Client"}
        </Link>
        <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight text-neutral-900">Integrations</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Connect ad accounts and channels for this client workspace. Only platforms included in the assigned plan are
          active; others are read-only.
        </p>
        {planName && (
          <p className="mt-1 text-xs text-neutral-600">
            Plan: <span className="font-semibold text-neutral-800">{planName}</span>
          </p>
        )}
      </div>

      {tokenWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-bold">Token expiring soon</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {tokenWarnings.map((w) => (
              <li key={w.integrationId}>
                {w.platform} token expires in {w.daysLeft} day{w.daysLeft === 1 ? "" : "s"} — reconnect to avoid data
                gaps.
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && <p className="text-sm text-neutral-600">Loading…</p>}

      {!loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((row) => {
            const meta = PLATFORM_COPY[row.platform];
            const href = connectHref(id, row.platform);
            const grey = !row.inPlan;
            const accent = platformHex(row.platform);

            return (
              <div
                key={row.platform}
                className={`flex flex-col rounded-2xl border p-5 shadow-sm ${
                  grey ? "border-neutral-200 bg-neutral-50 opacity-90" : "border-neutral-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {row.platform.slice(0, 2)}
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-neutral-900">{meta.title}</h2>
                      <p className="text-xs text-neutral-600">{meta.blurb}</p>
                    </div>
                  </div>
                  {grey ? (
                    <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-600">
                      Not in {planName ?? "plan"}
                    </span>
                  ) : (
                    <StatusPill status={row.status} />
                  )}
                </div>

                {row.integration && row.inPlan && (
                  <dl className="mt-3 space-y-1 text-xs text-neutral-600">
                    <div>
                      <dt className="font-bold text-neutral-600">Account</dt>
                      <dd className="text-neutral-800">{row.integration.accountName}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-neutral-600">ID</dt>
                      <dd className="font-mono text-[11px]">{row.integration.accountId}</dd>
                    </div>
                    {row.integration.lastSyncedAt && (
                      <div>
                        <dt className="font-bold text-neutral-600">Last synced</dt>
                        <dd>{new Date(row.integration.lastSyncedAt).toLocaleString()}</dd>
                      </div>
                    )}
                    {row.integration.tokenExpiresAt && (
                      <div>
                        <dt className="font-bold text-neutral-600">Token expires</dt>
                        <dd>{new Date(row.integration.tokenExpiresAt).toLocaleDateString()}</dd>
                      </div>
                    )}
                  </dl>
                )}

                {!grey && row.hint?.state === "PENDING_MANUAL" && !row.integration && (
                  <p className="mt-2 text-xs text-amber-800">
                    Onboarding note: manual setup
                    {row.hint.manualAccountId ? ` · ${row.hint.manualAccountId}` : ""}
                    {row.platform === "WHATSAPP" && row.hint.whatsappPhone
                      ? ` · ${row.hint.whatsappPhone}`
                      : ""}
                  </p>
                )}

                {meta.connectNote && row.inPlan && (
                  <p className="mt-2 text-[11px] text-neutral-600">{meta.connectNote}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {grey && (
                    <Link href="/agency/plans" className={buttonVariantStyles.secondary}>
                      Upgrade plan
                    </Link>
                  )}

                  {!grey && row.platform === "TWITTER" && (
                    <span className="text-xs text-neutral-600">Connector coming soon.</span>
                  )}

                  {!grey && row.platform === "WHATSAPP" && (
                    <>
                      {row.integration ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={!!removing || waRemoveLoading}
                            onClick={() => setWhatsappRemoveOpen(true)}
                          >
                            Remove
                          </Button>
                        </>
                      ) : (
                        <Button type="button" onClick={() => setWaOpen(true)}>
                          Connect
                        </Button>
                      )}
                      <p className="w-full text-[10px] text-neutral-600">
                        Webhook URL (configure in Meta):{" "}
                        <code className="rounded bg-neutral-100 px-1">{webhookBase || `…/api/webhooks/whatsapp/${id}`}</code>
                      </p>
                    </>
                  )}

                  {!grey && row.platform !== "WHATSAPP" && row.platform !== "TWITTER" && href && (
                    <>
                      {row.integration?.isActive ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={!!syncing}
                            onClick={() => void runSync(row.platform)}
                          >
                            {syncing === row.platform ? "Syncing…" : "Sync now"}
                          </Button>
                          <a className={buttonVariantStyles.secondary} href={href}>
                            Reconnect
                          </a>
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-red-800"
                            disabled={removing === row.integration?.id}
                            onClick={() => row.integration && setIntegrationRemoveId(row.integration.id)}
                          >
                            {removing === row.integration?.id ? "…" : "Remove"}
                          </Button>
                        </>
                      ) : (
                        <a className={buttonVariantStyles.primary} href={href}>
                          Connect
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={integrationRemoveId !== null}
        title="Remove this connection?"
        message="Campaign sync will stop for this ad account. You can reconnect later."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={integrationRemoveId !== null && removing === integrationRemoveId}
        onConfirm={() => void confirmRemoveIntegration()}
        onCancel={() => removing !== integrationRemoveId && setIntegrationRemoveId(null)}
      />

      <ConfirmModal
        isOpen={whatsappRemoveOpen}
        title="Disconnect WhatsApp?"
        message="Alerts and messaging for this client will stop until you connect again."
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={waRemoveLoading}
        onConfirm={() => void confirmRemoveWhatsApp()}
        onCancel={() => !waRemoveLoading && setWhatsappRemoveOpen(false)}
      />

      {waOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="absolute inset-0" aria-hidden onClick={() => !waSaving && setWaOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-neutral-900">WhatsApp Business Cloud</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Phone Number ID and permanent token from Meta Developer — validated via Graph API.
            </p>
            <label className="mt-4 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Phone Number ID
              <input
                value={waPhoneId}
                onChange={(e) => setWaPhoneId(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Access token
              <input
                value={waToken}
                onChange={(e) => setWaToken(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm"
                autoComplete="off"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={buttonVariantStyles.ghost} onClick={() => setWaOpen(false)} disabled={waSaving}>
                Cancel
              </button>
              <Button type="button" disabled={waSaving} onClick={() => void saveWhatsApp()}>
                {waSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: CardRow["status"] }) {
  const label =
    status === "connected"
      ? "Connected"
      : status === "pending"
        ? "Pending"
        : status === "unavailable"
          ? "Not in plan"
          : "Not connected";
  const cls =
    status === "connected"
      ? "bg-emerald-100 text-emerald-900"
      : status === "pending"
        ? "bg-amber-100 text-amber-900"
        : "bg-neutral-100 text-neutral-700";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}>{label}</span>;
}
