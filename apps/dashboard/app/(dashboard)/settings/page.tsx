"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { BillingSettings } from "@/components/settings/BillingSettings";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import toast from "react-hot-toast";
import { useCallback, useEffect, useState } from "react";

const TABS = ["Profile", "Organization", "Alerts", "Billing"] as const;

type AIUsagePayload = {
  totalCallsThisMonth: number;
  totalTokensThisMonth: number;
  estimatedCostUSDThisMonth: number;
  hourlyRateLimit: number;
  byFeature: Record<string, { calls: number; tokens: number; costUSD: number }>;
};

function AIUsageSection() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [usage, setUsage] = useState<AIUsagePayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/ai/usage", { credentials: "include", cache: "no-store" });
      if (r.status === 403) {
        setErr("Owner access required.");
        setUsage(null);
        return;
      }
      if (!r.ok) {
        setErr("Could not load AI usage.");
        setUsage(null);
        return;
      }
      const data = (await r.json()) as AIUsagePayload;
      setUsage(data);
    } catch {
      setErr("Network error");
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mt-8 border-t border-neutral-100 pt-6">
      <h3 className="text-sm font-bold text-neutral-900">AI usage (this month)</h3>
      <p className="mt-1 text-xs text-neutral-600">
        Anthropic Claude via Hello Add — tracked for billing transparency. Owners only.
      </p>
      {loading && <p className="mt-4 text-sm text-neutral-600">Loading…</p>}
      {err && !loading && (
        <p className="mt-4 text-sm text-amber-800">{err}</p>
      )}
      {usage && !loading && (
        <div className="mt-4 space-y-3 text-sm text-neutral-800">
          <p>
            Calls: <strong>{usage.totalCallsThisMonth}</strong> · Tokens:{" "}
            <strong>{usage.totalTokensThisMonth.toLocaleString()}</strong> · Est. cost (USD):{" "}
            <strong>${usage.estimatedCostUSDThisMonth.toFixed(4)}</strong>
          </p>
          <p className="text-xs text-neutral-600">
            Plan rate limit (calls / hour cap): <strong>{usage.hourlyRateLimit}</strong>
          </p>
          {Object.keys(usage.byFeature).length > 0 && (
            <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-3 text-xs">
              <p className="font-bold text-neutral-700">By feature</p>
              <ul className="mt-2 space-y-1">
                {Object.entries(usage.byFeature).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v.calls} calls, {v.tokens} tokens, ${v.costUSD.toFixed(4)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button type="button" variant="secondary" className="text-xs" onClick={() => void load()}>
            Refresh usage
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Profile");
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(true);
  const [monthlyReportEnabled, setMonthlyReportEnabled] = useState(true);
  const [reportEmail, setReportEmail] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testWaSending, setTestWaSending] = useState(false);
  const [testEmailSending, setTestEmailSending] = useState(false);
  const { user, organizations, refresh } = useAuth();
  const orgRole = organizations[0]?.role;
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [orgIsAgency, setOrgIsAgency] = useState(false);
  const [agencySaving, setAgencySaving] = useState(false);
  const [cpSaving, setCpSaving] = useState(false);
  const [cpLogoUploading, setCpLogoUploading] = useState(false);
  const [cpDisplayName, setCpDisplayName] = useState("");
  const [cpPrimary, setCpPrimary] = useState("#0ea5e9");
  const [cpColorScheme, setCpColorScheme] = useState<"LIGHT" | "DARK" | "CUSTOM">("LIGHT");
  const [cpBackground, setCpBackground] = useState("#f8fafc");
  const [cpText, setCpText] = useState("#0f172a");
  const [cpLogoUrl, setCpLogoUrl] = useState("");
  const [cpShowOverview, setCpShowOverview] = useState(true);
  const [cpShowCampaigns, setCpShowCampaigns] = useState(true);
  const [cpShowReports, setCpShowReports] = useState(true);
  const [orgName, setOrgName] = useState("");
  const [orgTimezone, setOrgTimezone] = useState("Asia/Kolkata");
  const [orgCurrency, setOrgCurrency] = useState("INR");
  const [orgSaving, setOrgSaving] = useState(false);
  const [deleteOrgConfirm, setDeleteOrgConfirm] = useState("");
  const [deleteOrgSubmitting, setDeleteOrgSubmitting] = useState(false);
  const [deleteWorkspaceModalOpen, setDeleteWorkspaceModalOpen] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "Billing") setTab("Billing");
    if (t === "Organization") setTab("Organization");
  }, []);

  useEffect(() => {
    setProfileName(user?.name ?? "");
    setProfileEmail(user?.email ?? "");
  }, [user?.name, user?.email]);

  const loadOrgBranding = useCallback(async () => {
    try {
      const r = await fetch("/api/organization", { credentials: "include", cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as {
        name?: string;
        isAgency?: boolean;
        settings?: {
          timezone?: string | null;
          currency?: string | null;
          clientPortalBranding?: {
            displayName?: string | null;
            primaryColor?: string | null;
            colorScheme?: "LIGHT" | "DARK" | "CUSTOM" | null;
            backgroundColor?: string | null;
            textColor?: string | null;
            logoUrl?: string | null;
            showOverview?: boolean;
            showCampaigns?: boolean;
            showReports?: boolean;
          } | null;
        };
      };
      setOrgName(typeof d.name === "string" ? d.name : "");
      setOrgIsAgency(Boolean(d.isAgency));
      setOrgTimezone(d.settings?.timezone?.trim() || "Asia/Kolkata");
      setOrgCurrency(d.settings?.currency?.trim() || "INR");
      const b = d.settings?.clientPortalBranding;
      setCpDisplayName(b?.displayName?.trim() ?? "");
      setCpPrimary(b?.primaryColor?.trim() || "#0ea5e9");
      const nextScheme = b?.colorScheme === "DARK" || b?.colorScheme === "CUSTOM" ? b.colorScheme : "LIGHT";
      setCpColorScheme(nextScheme);
      setCpBackground(
        b?.backgroundColor?.trim() ||
          (nextScheme === "DARK" ? "#0a0f1a" : "#f8fafc")
      );
      setCpText(
        b?.textColor?.trim() ||
          (nextScheme === "DARK" ? "#e5e7eb" : "#0f172a")
      );
      setCpLogoUrl(b?.logoUrl?.trim() ?? "");
      setCpShowOverview(b?.showOverview !== false);
      setCpShowCampaigns(b?.showCampaigns !== false);
      setCpShowReports(b?.showReports !== false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadOrgBranding();
  }, [loadOrgBranding]);

  async function saveAgencyMode(next: boolean) {
    if (orgRole !== "OWNER" && orgRole !== "ADMIN") {
      toast.error("Only owners and admins can change this.");
      return;
    }
    const prev = orgIsAgency;
    setOrgIsAgency(next);
    setAgencySaving(true);
    try {
      const r = await fetch("/api/organization", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAgency: next }),
      });
      if (!r.ok) {
        setOrgIsAgency(prev);
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        toast.error(typeof j.error === "string" ? j.error : "Could not update agency mode");
        return;
      }
      toast.success(next ? "Agency workspace enabled" : "Agency workspace turned off");
    } finally {
      setAgencySaving(false);
    }
  }

  function requestDeleteWorkspace() {
    if (!orgName) {
      toast.error("Organization name not loaded yet.");
      return;
    }
    if (deleteOrgConfirm.trim() !== orgName.trim()) {
      toast.error("Type the workspace name exactly to confirm.");
      return;
    }
    setDeleteWorkspaceModalOpen(true);
  }

  async function confirmDeleteWorkspace() {
    if (!orgName || deleteOrgConfirm.trim() !== orgName.trim()) {
      setDeleteWorkspaceModalOpen(false);
      return;
    }
    setDeleteOrgSubmitting(true);
    try {
      const r = await fetch("/api/organization", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationName: deleteOrgConfirm.trim() }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not delete workspace");
        return;
      }
      setDeleteWorkspaceModalOpen(false);
      toast.success("Workspace deleted");
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/login";
    } catch {
      toast.error("Network error");
    } finally {
      setDeleteOrgSubmitting(false);
    }
  }

  async function uploadClientPortalLogo(file: File) {
    if (orgRole === "VIEWER") {
      toast.error("You don’t have permission to upload.");
      return;
    }
    setCpLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/organization/client-portal-logo", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as { logoUrl?: string; error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not upload logo");
        return;
      }
      if (typeof j.logoUrl === "string") {
        setCpLogoUrl(j.logoUrl);
        toast.success("Logo saved for the client portal");
        await loadOrgBranding();
      }
    } catch {
      toast.error("Network error");
    } finally {
      setCpLogoUploading(false);
    }
  }

  async function saveClientPortalBranding() {
    setCpSaving(true);
    try {
      const r = await fetch("/api/organization", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            clientPortalBranding: {
              displayName: cpDisplayName.trim() || null,
              primaryColor: cpPrimary.trim() || null,
              colorScheme: cpColorScheme,
              backgroundColor: cpBackground.trim() || null,
              textColor: cpText.trim() || null,
              logoUrl: cpLogoUrl.trim() || null,
              showOverview: cpShowOverview,
              showCampaigns: cpShowCampaigns,
              showReports: cpShowReports,
            },
          },
        }),
      });
      if (!r.ok) {
        toast.error("Could not save client portal branding");
        return;
      }
      toast.success("Client portal branding saved");
    } finally {
      setCpSaving(false);
    }
  }

  const loadAlertsSettings = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const r = await fetch("/api/organization", { credentials: "include", cache: "no-store" });
      if (!r.ok) return;
      const data = (await r.json()) as {
        settings?: {
          weeklyReportEnabled?: boolean;
          monthlyReportEnabled?: boolean;
          reportEmail?: string | null;
          alertEmail?: string | null;
          whatsappNumber?: string | null;
        };
      };
      const s = data.settings;
      if (!s) return;
      setWeeklyReportEnabled(s.weeklyReportEnabled !== false);
      setMonthlyReportEnabled(s.monthlyReportEnabled !== false);
      setReportEmail(s.reportEmail ?? "");
      setAlertEmail(s.alertEmail ?? "");
      setWhatsappNumber(s.whatsappNumber ?? "");
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "Alerts") void loadAlertsSettings();
  }, [tab, loadAlertsSettings]);

  async function saveAlertsSettings() {
    setAlertsLoading(true);
    try {
      const r = await fetch("/api/organization", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            weeklyReportEnabled,
            monthlyReportEnabled,
            reportEmail: reportEmail.trim() || null,
            alertEmail: alertEmail.trim() || null,
            whatsappNumber: whatsappNumber.trim() || null,
          },
        }),
      });
      if (!r.ok) {
        toast.error("Could not save settings");
        return;
      }
      toast.success("Alerts & reports saved");
    } finally {
      setAlertsLoading(false);
    }
  }

  async function saveOrganizationBasics() {
    if (orgRole === "VIEWER") {
      toast.error("You don’t have permission to update organization settings.");
      return;
    }
    if (!orgName.trim()) {
      toast.error("Company name is required");
      return;
    }
    setOrgSaving(true);
    try {
      const r = await fetch("/api/organization", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName.trim(),
          settings: {
            timezone: orgTimezone,
            currency: orgCurrency,
          },
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not save organization");
        return;
      }
      toast.success("Organization settings saved");
      await loadOrgBranding();
    } finally {
      setOrgSaving(false);
    }
  }

  async function saveProfile() {
    if (!profileName.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!profileEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    if (profileNewPassword && profileNewPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (profileNewPassword !== profileConfirmPassword) {
      toast.error("Password confirmation does not match");
      return;
    }

    setProfileSaving(true);
    try {
      const r = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName.trim(),
          email: profileEmail.trim().toLowerCase(),
          ...(profileNewPassword ? { newPassword: profileNewPassword } : {}),
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not save profile");
        return;
      }
      setProfileNewPassword("");
      setProfileConfirmPassword("");
      await refresh();
      toast.success("Profile updated");
    } finally {
      setProfileSaving(false);
    }
  }

  async function sendTestReport() {
    setTestSending(true);
    try {
      const r = await fetch("/api/reports/test-send", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; sentTo?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Send failed");
        return;
      }
      toast.success(`Test report sent to ${j.sentTo ?? "your inbox"}`);
    } finally {
      setTestSending(false);
    }
  }

  async function sendTestDigestEmail() {
    setTestEmailSending(true);
    try {
      const r = await fetch("/api/alerts/test-email", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; sentTo?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Test email failed");
        return;
      }
      toast.success(`Test digest sent to ${j.sentTo ?? "your inbox"}`);
    } finally {
      setTestEmailSending(false);
    }
  }

  async function sendTestWhatsApp() {
    setTestWaSending(true);
    try {
      const r = await fetch("/api/alerts/test-whatsapp", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; sentTo?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "WhatsApp test failed");
        return;
      }
      toast.success(`Test WhatsApp sent to ${j.sentTo ?? "your number"}`);
    } finally {
      setTestWaSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Settings</h1>
        <p className="mt-1 text-sm text-neutral-600">Manage your profile, org, alerts, and billing.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === t ? "bg-primary text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Profile" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Profile</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Full name
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Work email
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600 md:col-span-2">
              Avatar
              <input type="file" className="text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              New password
              <input
                type="password"
                placeholder="••••••••"
                value={profileNewPassword}
                onChange={(e) => setProfileNewPassword(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Confirm password
              <input
                type="password"
                placeholder="••••••••"
                value={profileConfirmPassword}
                onChange={(e) => setProfileConfirmPassword(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="button" disabled={profileSaving} onClick={() => void saveProfile()}>
              {profileSaving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </section>
      )}

      {tab === "Organization" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Organization</h2>
          {(orgRole === "OWNER" || orgRole === "ADMIN") && (
            <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={orgIsAgency}
                  disabled={agencySaving}
                  onChange={(e) => void saveAgencyMode(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span>
                  <span className="text-sm font-semibold text-neutral-900">Agency workspace</span>
                  <span className="mt-1 block text-xs text-neutral-600">
                    Manage multiple clients, roll-up KPIs on the Agency page, and use client portal links.
                  </span>
                </span>
              </label>
            </div>
          )}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Company name
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Logo
              <input type="file" className="text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Timezone
              <select
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                value={orgTimezone}
                onChange={(e) => setOrgTimezone(e.target.value)}
              >
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="Asia/Singapore">Asia/Singapore</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Currency
              <select
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                value={orgCurrency}
                onChange={(e) => setOrgCurrency(e.target.value)}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="SGD">SGD</option>
              </select>
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="button" disabled={orgSaving || orgRole === "VIEWER"} onClick={() => void saveOrganizationBasics()}>
              {orgSaving ? "Saving…" : "Save organization"}
            </Button>
          </div>

          {orgIsAgency && (
            <div className="mt-10 border-t border-neutral-100 pt-8">
              <h3 className="text-sm font-bold text-neutral-900">Client portal branding</h3>
              <p className="mt-1 text-xs text-neutral-600">
                What clients see after opening a portal link from your team. Access is read-only via a signed
                browser session.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600 md:col-span-2">
                  Display name
                  <input
                    value={cpDisplayName}
                    onChange={(e) => setCpDisplayName(e.target.value)}
                    placeholder="Your agency name"
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                  Primary color
                  <input
                    type="color"
                    value={cpPrimary}
                    onChange={(e) => setCpPrimary(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-xl border border-neutral-200"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                  Color schema
                  <select
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                    value={cpColorScheme}
                    onChange={(e) => {
                      const next = e.target.value as "LIGHT" | "DARK" | "CUSTOM";
                      setCpColorScheme(next);
                      if (next === "LIGHT") {
                        setCpBackground("#f8fafc");
                        setCpText("#0f172a");
                      } else if (next === "DARK") {
                        setCpBackground("#0a0f1a");
                        setCpText("#e5e7eb");
                      }
                    }}
                  >
                    <option value="LIGHT">Light</option>
                    <option value="DARK">Dark</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                  Portal background
                  <input
                    type="color"
                    value={cpBackground}
                    onChange={(e) => setCpBackground(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-xl border border-neutral-200"
                    disabled={cpColorScheme !== "CUSTOM"}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                  Portal text
                  <input
                    type="color"
                    value={cpText}
                    onChange={(e) => setCpText(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-xl border border-neutral-200"
                    disabled={cpColorScheme !== "CUSTOM"}
                  />
                </label>
                <div className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                  <span>Agency logo</span>
                  <p className="mb-2 font-normal text-neutral-600">
                    PNG, JPEG, or WebP · max 2 MB. You can also paste a public URL below.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={cpLogoUploading || orgRole === "VIEWER"}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) void uploadClientPortalLogo(f);
                        }}
                      />
                      {cpLogoUploading ? "Uploading…" : "Upload logo"}
                    </label>
                    {cpLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cpLogoUrl}
                        alt=""
                        className="h-10 w-auto max-w-[140px] rounded border border-neutral-100 object-contain"
                      />
                    ) : null}
                  </div>
                </div>
                <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600 md:col-span-2">
                  Logo URL (optional)
                  <input
                    value={cpLogoUrl}
                    onChange={(e) => setCpLogoUrl(e.target.value)}
                    placeholder="https://… or use upload above"
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <div className="md:col-span-2 rounded-xl border border-neutral-200 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">Live portal preview</p>
                  <div
                    className="mt-3 overflow-hidden rounded-xl border"
                    style={{
                      backgroundColor: cpBackground,
                      color: cpText,
                      borderColor: cpColorScheme === "DARK" ? "#1f2937" : "#e5e7eb",
                    }}
                  >
                    <div
                      className="flex items-center justify-between border-b px-3 py-2"
                      style={{
                        backgroundColor: cpColorScheme === "DARK" ? "#0f172a" : "#ffffff",
                        borderColor: cpColorScheme === "DARK" ? "#1f2937" : "#e5e7eb",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {cpLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cpLogoUrl} alt="" className="h-6 w-auto max-w-[110px] object-contain" />
                        ) : (
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white"
                            style={{ backgroundColor: cpPrimary }}
                          >
                            {(cpDisplayName.trim() || "A").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold">{cpDisplayName.trim() || "Agency portal"}</p>
                          <p
                            className="text-[10px]"
                            style={{ color: cpColorScheme === "DARK" ? "#9ca3af" : "#6b7280" }}
                          >
                            View-only reporting
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-semibold">
                        <span className="rounded-full px-2 py-0.5" style={{ backgroundColor: cpPrimary, color: "#fff" }}>
                          Overview
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5"
                          style={{ color: cpColorScheme === "DARK" ? "#9ca3af" : "#6b7280" }}
                        >
                          Campaigns
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5"
                          style={{ color: cpColorScheme === "DARK" ? "#9ca3af" : "#6b7280" }}
                        >
                          Reports
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 p-3 text-[11px]">
                      <div className="rounded-lg border border-neutral-200/60 bg-white/60 px-2 py-1">
                        Monthly spend: <strong>INR 1,24,500</strong>
                      </div>
                      <div className="rounded-lg border border-neutral-200/60 bg-white/60 px-2 py-1">
                        Active campaigns: <strong>6</strong>
                      </div>
                    </div>
                  </div>
                </div>
                <ul className="md:col-span-2 space-y-2 text-sm text-neutral-700">
                  <li className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2">
                    <span>Show overview</span>
                    <input
                      type="checkbox"
                      checked={cpShowOverview}
                      onChange={(e) => setCpShowOverview(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                  </li>
                  <li className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2">
                    <span>Show campaigns</span>
                    <input
                      type="checkbox"
                      checked={cpShowCampaigns}
                      onChange={(e) => setCpShowCampaigns(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                  </li>
                  <li className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2">
                    <span>Show reports</span>
                    <input
                      type="checkbox"
                      checked={cpShowReports}
                      onChange={(e) => setCpShowReports(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                  </li>
                </ul>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  disabled={cpSaving || orgRole === "VIEWER"}
                  onClick={() => void saveClientPortalBranding()}
                >
                  {cpSaving ? "Saving…" : "Save client portal branding"}
                </Button>
              </div>
            </div>
          )}

          {orgRole === "OWNER" && (
            <div className="mt-10 border-t border-red-100 pt-8">
              <h3 className="text-sm font-bold text-red-800">Danger zone</h3>
              <p className="mt-1 text-xs text-neutral-600">
                Delete this workspace forever. You must cancel any paid subscription in Billing first. Agency
                workspaces must remove all clients first.
              </p>
              <label className="mt-4 flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Type workspace name to confirm
                <input
                  value={deleteOrgConfirm}
                  onChange={(e) => setDeleteOrgConfirm(e.target.value)}
                  placeholder={orgName || "Exact name from API"}
                  autoComplete="off"
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="border-red-200 bg-red-50 text-red-900 hover:bg-red-100"
                  disabled={deleteOrgSubmitting || !orgName}
                  onClick={() => requestDeleteWorkspace()}
                >
                  {deleteOrgSubmitting ? "Deleting…" : "Delete workspace"}
                </Button>
              </div>
            </div>
          )}

          {orgRole === "OWNER" && <AIUsageSection />}
        </section>
      )}

      {tab === "Alerts" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Alerts &amp; scheduled reports</h2>
          <p className="mt-1 text-xs text-neutral-600">
            Weekly jobs Monday ~9:00 IST (PDF report + digest email) · Monthly on the 1st · requires a
            long-lived server with <code className="rounded bg-neutral-100 px-1">ENABLE_REPORT_CRON=true</code>{" "}
            and Resend configured.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-neutral-700">
            <li className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2">
              <span>Send weekly report &amp; digest every Monday</span>
              <input
                type="checkbox"
                checked={weeklyReportEnabled}
                onChange={(e) => setWeeklyReportEnabled(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
            </li>
            <li className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2">
              <span>Send monthly report on the 1st</span>
              <input
                type="checkbox"
                checked={monthlyReportEnabled}
                onChange={(e) => setMonthlyReportEnabled(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
            </li>
          </ul>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Report email address
              <input
                type="email"
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
                placeholder="you@company.com"
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Email for alerts (critical issues + digest recipient order)
              <input
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="alerts@company.com"
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600 md:col-span-2">
              WhatsApp number
              <input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+91 …"
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={testEmailSending || alertsLoading}
              onClick={() => void sendTestDigestEmail()}
            >
              {testEmailSending ? "Sending…" : "Send test digest email"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={testWaSending || alertsLoading}
              onClick={() => void sendTestWhatsApp()}
            >
              {testWaSending ? "Sending…" : "Test WhatsApp"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={testSending || alertsLoading}
              onClick={() => void sendTestReport()}
            >
              {testSending ? "Sending…" : "Send test report"}
            </Button>
            <Button type="button" disabled={alertsLoading} onClick={() => void saveAlertsSettings()}>
              {alertsLoading ? "Saving…" : "Save alerts"}
            </Button>
          </div>
        </section>
      )}

      {tab === "Billing" && <BillingSettings orgRole={orgRole} />}

      <ConfirmModal
        isOpen={deleteWorkspaceModalOpen}
        title="Delete workspace forever?"
        message="This permanently deletes the workspace and all campaigns, reports, and integrations. You will be signed out."
        confirmLabel="Yes, delete workspace"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleteOrgSubmitting}
        onConfirm={() => void confirmDeleteWorkspace()}
        onCancel={() => !deleteOrgSubmitting && setDeleteWorkspaceModalOpen(false)}
      />
    </div>
  );
}
