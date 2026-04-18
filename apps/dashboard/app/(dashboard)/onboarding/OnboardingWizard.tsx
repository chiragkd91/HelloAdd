"use client";

import { Button } from "@/components/ui/Button";
import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Step = 1 | 2 | 3 | 4;

const CONNECT_QUERY: Record<string, "facebook" | "google" | "linkedin"> = {
  facebook: "facebook",
  google: "google",
  linkedin: "linkedin",
};

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [connected, setConnected] = useState<Set<string>>(() => new Set());
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);

  const [totalBudget, setTotalBudget] = useState<number>(100000);
  const [fb, setFb] = useState(25);
  const [goo, setGoo] = useState(25);
  const [li, setLi] = useState(25);
  const youtube = useMemo(() => Math.max(0, 100 - fb - goo - li), [fb, goo, li]);

  const [inviteRows, setInviteRows] = useState<
    { email: string; role: "ADMIN" | "MANAGER" | "VIEWER" }[]
  >([
    { email: "", role: "MANAGER" },
    { email: "", role: "VIEWER" },
    { email: "", role: "VIEWER" },
  ]);

  const [summary, setSummary] = useState({
    budgetSaved: false,
    invitesSent: 0,
  });
  const [finishing, setFinishing] = useState(false);

  const loadIntegrations = useCallback(async () => {
    setLoadingIntegrations(true);
    try {
      const r = await fetch("/api/integrations", { credentials: "include", cache: "no-store" });
      if (!r.ok) return;
      const data = (await r.json()) as { items: { platform: string }[] };
      const next = new Set<string>();
      for (const it of data.items ?? []) {
        if (it.platform === "FACEBOOK" || it.platform === "INSTAGRAM") next.add("facebook");
        if (it.platform === "GOOGLE" || it.platform === "YOUTUBE") {
          next.add("google");
        }
        if (it.platform === "LINKEDIN") next.add("linkedin");
      }
      setConnected(next);
    } finally {
      setLoadingIntegrations(false);
    }
  }, []);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  useEffect(() => {
    const q = searchParams.get("connected");
    if (q && CONNECT_QUERY[q]) {
      setConnected((prev) => new Set(prev).add(CONNECT_QUERY[q]));
      router.replace("/onboarding", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (step !== 1 || loadingIntegrations) return;
    if (connected.size >= 1) {
      const t = window.setTimeout(() => setStep(2), 600);
      return () => clearTimeout(t);
    }
  }, [step, connected.size, loadingIntegrations]);

  function clamp3(a: number, b: number, c: number): [number, number, number] {
    let x = Math.max(0, Math.min(100, a));
    let y = Math.max(0, Math.min(100, b));
    let z = Math.max(0, Math.min(100, c));
    const sum = x + y + z;
    if (sum > 100) {
      const scale = 100 / sum;
      x = Math.floor(x * scale);
      y = Math.floor(y * scale);
      z = 100 - x - y;
    }
    return [x, y, z];
  }

  async function saveBudget() {
    const [a, b, c] = clamp3(fb, goo, li);
    const yt = 100 - a - b - c;
    const now = new Date();
    const body = {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      totalBudget,
      platforms: {
        FACEBOOK: a,
        GOOGLE: b,
        LINKEDIN: c,
        YOUTUBE: yt,
      },
    };
    const r = await fetch("/api/budget", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      toast.error("Could not save budget");
      return;
    }
    setSummary((s) => ({ ...s, budgetSaved: true }));
    toast.success("Budget saved");
    setStep(3);
  }

  async function sendInvites() {
    let sent = 0;
    for (const row of inviteRows) {
      const email = row.email.trim().toLowerCase();
      if (!email) continue;
      const r = await fetch("/api/organization/invites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: row.role }),
      });
      if (r.ok) sent += 1;
    }
    setSummary((s) => ({ ...s, invitesSent: sent }));
    if (sent > 0) toast.success(sent === 1 ? "Invite sent" : `${sent} invites sent`);
    setStep(4);
  }

  async function completeOnboarding() {
    setFinishing(true);
    try {
      const r = await fetch("/api/organization", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingComplete: true }),
      });
      if (!r.ok) {
        toast.error("Could not finish onboarding");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setFinishing(false);
    }
  }

  const base = "/api/integrations";
  const metaHref = `${base}/meta/connect?next=${encodeURIComponent("/onboarding")}`;
  const googleHref = `${base}/google/connect?next=${encodeURIComponent("/onboarding")}`;
  const liHref = `${base}/linkedin/connect?next=${encodeURIComponent("/onboarding")}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8 flex justify-center gap-2">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-2 w-8 rounded-full ${step >= n ? "bg-primary" : "bg-neutral-200"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-neutral-900">Let&apos;s connect your ad accounts</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Link at least one platform to pull live performance data. You can add more later from
            Integrations.
          </p>
          {loadingIntegrations ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-neutral-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking existing connections…
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              <li className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3">
                <div>
                  <p className="font-semibold text-neutral-900">Meta (Facebook + Instagram)</p>
                  <p className="text-xs text-neutral-600">Ads + Instagram placements</p>
                </div>
                <div className="flex items-center gap-2">
                  {connected.has("facebook") && (
                    <Check className="h-5 w-5 text-primary" aria-label="Connected" />
                  )}
                  <a href={metaHref} className={`${buttonVariantStyles.secondary} px-3 py-1.5 text-xs`}>
                    Connect
                  </a>
                </div>
              </li>
              <li className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3">
                <div>
                  <p className="font-semibold text-neutral-900">Google Ads</p>
                  <p className="text-xs text-neutral-600">Search, PMax, YouTube line items</p>
                </div>
                <div className="flex items-center gap-2">
                  {connected.has("google") && (
                    <Check className="h-5 w-5 text-primary" aria-label="Connected" />
                  )}
                  <a href={googleHref} className={`${buttonVariantStyles.secondary} px-3 py-1.5 text-xs`}>
                    Connect
                  </a>
                </div>
              </li>
              <li className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3">
                <div>
                  <p className="font-semibold text-neutral-900">LinkedIn</p>
                  <p className="text-xs text-neutral-600">Campaign Manager</p>
                </div>
                <div className="flex items-center gap-2">
                  {connected.has("linkedin") && (
                    <Check className="h-5 w-5 text-primary" aria-label="Connected" />
                  )}
                  <a href={liHref} className={`${buttonVariantStyles.secondary} px-3 py-1.5 text-xs`}>
                    Connect
                  </a>
                </div>
              </li>
            </ul>
          )}
          <button
            type="button"
            className="mt-6 text-sm font-medium text-primary hover:underline"
            onClick={() => setStep(2)}
          >
            Skip — use demo data
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-neutral-900">What&apos;s your total monthly ad budget?</h1>
          <label className="mt-4 block text-xs font-medium text-neutral-600">
            Total (₹ / month)
            <input
              type="number"
              min={0}
              step={1000}
              value={totalBudget}
              onChange={(e) => setTotalBudget(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-3 text-2xl font-bold tabular-nums text-neutral-900"
            />
          </label>
          <p className="mt-6 text-sm font-medium text-neutral-800">Split across platforms (%)</p>
          <p className="text-xs text-neutral-600">Adjust Facebook, Google, and LinkedIn — YouTube fills the rest.</p>
          <div className="mt-4 space-y-4">
            <label className="block text-xs font-medium text-neutral-600">
              Facebook {fb}%
              <input
                type="range"
                min={0}
                max={100}
                value={fb}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const [a, b, c] = clamp3(v, goo, li);
                  setFb(a);
                  setGoo(b);
                  setLi(c);
                }}
                className="mt-1 w-full accent-primary"
              />
            </label>
            <label className="block text-xs font-medium text-neutral-600">
              Google {goo}%
              <input
                type="range"
                min={0}
                max={100}
                value={goo}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const [a, b, c] = clamp3(fb, v, li);
                  setFb(a);
                  setGoo(b);
                  setLi(c);
                }}
                className="mt-1 w-full accent-primary"
              />
            </label>
            <label className="block text-xs font-medium text-neutral-600">
              LinkedIn {li}%
              <input
                type="range"
                min={0}
                max={100}
                value={li}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const [a, b, c] = clamp3(fb, goo, v);
                  setFb(a);
                  setGoo(b);
                  setLi(c);
                }}
                className="mt-1 w-full accent-primary"
              />
            </label>
            <p className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
              YouTube (auto): <strong>{youtube}%</strong>
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveBudget()}>
              Save budget
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep(3)}>
              Skip for now
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-neutral-900">Invite your team members</h1>
          <p className="mt-1 text-sm text-neutral-600">Optional — you can always invite people from Team later.</p>
          <div className="mt-4 space-y-3">
            {inviteRows.map((row, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={row.email}
                  onChange={(e) => {
                    const next = [...inviteRows];
                    next[i] = { ...next[i], email: e.target.value };
                    setInviteRows(next);
                  }}
                  className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                />
                <select
                  value={row.role}
                  onChange={(e) => {
                    const next = [...inviteRows];
                    next[i] = { ...next[i], role: e.target.value as "ADMIN" | "MANAGER" | "VIEWER" };
                    setInviteRows(next);
                  }}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void sendInvites()}>
              Send invites
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep(4)}>
              Skip — I&apos;ll do this later
            </Button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-neutral-900">You&apos;re all set! 🎉</h1>
          <ul className="mt-4 space-y-2 text-sm text-neutral-700">
            <li>
              • Platforms:{" "}
              {connected.size
                ? Array.from(connected).join(", ")
                : "None linked yet (demo or skip)"}
            </li>
            <li>• Budget: {summary.budgetSaved ? `₹${totalBudget.toLocaleString("en-IN")} / mo` : "Skipped"}</li>
            <li>
              • Invites:{" "}
              {summary.invitesSent > 0
                ? `${summary.invitesSent} sent`
                : "None sent"}
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="button" disabled={finishing} onClick={() => void completeOnboarding()}>
              {finishing ? "Saving…" : "Go to Dashboard →"}
            </Button>
            <Link href="/integrations" className="text-sm font-medium text-primary hover:underline">
              Open integrations
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
