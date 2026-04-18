"use client";

import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

type PreviewOk = {
  valid: true;
  organizationName: string;
  role: string;
  emailHint: string;
};

type PreviewBad = {
  valid: false;
  reason: string;
};

function AcceptInviteContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token")?.trim() ?? "";

  const [preview, setPreview] = useState<PreviewOk | PreviewBad | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoAcceptTried = useRef(false);

  useEffect(() => {
    if (!token) {
      setPreview({ valid: false, reason: "missing" });
      return;
    }
    let cancelled = false;
    fetch(`/api/organization/invites/preview?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<PreviewOk | PreviewBad>)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setPreview({ valid: false, reason: "network" });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !preview || preview.valid !== true || autoAcceptTried.current) return;
    autoAcceptTried.current = true;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const r = await fetch("/api/organization/invites/accept", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (r.ok) {
          router.replace("/");
          router.refresh();
          return;
        }
        if (r.status === 401) {
          return;
        }
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(typeof j.error === "string" ? j.error : "Could not accept invite.");
      } catch {
        if (!cancelled) setError("Network error.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, preview, router]);

  const loginHref = `/login?from=${encodeURIComponent(`/accept-invite?token=${token}`)}&invite=${encodeURIComponent(token)}`;
  const registerHref = `/register?invite=${encodeURIComponent(token)}`;

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-xl font-bold text-neutral-900">Missing invite</h1>
        <p className="mt-2 text-sm text-neutral-600">Open the full link from your invitation email or team page.</p>
        <Link href="/login" className="mt-6 inline-block font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-sm text-neutral-500" aria-live="polite">
        Checking invite…
      </div>
    );
  }

  if (preview.valid === false) {
    const msg =
      preview.reason === "already_used"
        ? "This invite was already used."
        : preview.reason === "expired"
          ? "This invite has expired. Ask an admin to send a new one."
          : preview.reason === "network"
            ? "Could not verify the invite. Try again."
            : "This invite link is invalid.";
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-xl font-bold text-neutral-900">Invite unavailable</h1>
        <p className="mt-2 text-sm text-neutral-600">{msg}</p>
        <Link href="/login" className="mt-6 inline-block font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Join workspace</h1>
      <p className="mt-2 text-sm text-neutral-600">
        You&apos;re invited to <strong className="text-neutral-800">{preview.organizationName}</strong> as{" "}
        <strong className="text-neutral-800">{preview.role}</strong>.
      </p>
      <p className="mt-1 text-sm text-neutral-500">Invited address: {preview.emailHint}</p>

      {busy && (
        <p className="mt-6 text-sm text-neutral-500" aria-live="polite">
          Joining workspace…
        </p>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error}
        </div>
      )}

      {!busy && error && (
        <Button type="button" className="mt-4" onClick={() => window.location.reload()}>
          Try again
        </Button>
      )}

      {!busy && !error && (
        <p className="mt-6 text-sm text-neutral-500">
          If you are not signed in yet, use the same email this invite was sent to.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href={loginHref} className="inline-flex">
          <Button type="button" variant="secondary" className="w-full">
            Sign in to accept
          </Button>
        </Link>
        <Link href={registerHref} className="inline-flex">
          <Button type="button" className="w-full">
            Create account
          </Button>
        </Link>
      </div>
    </div>
  );
}

function AcceptInviteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500" aria-live="polite">
      Loading…
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-[100dvh] bg-neutral-100">
      <Suspense fallback={<AcceptInviteFallback />}>
        <AcceptInviteContent />
      </Suspense>
    </div>
  );
}
