"use client";

import type { ClientPortalSection } from "@/lib/api/clientPortalSection";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Branding = {
  displayName: string;
  primaryColor: string;
  colorScheme: "LIGHT" | "DARK" | "CUSTOM";
  backgroundColor: string;
  textColor: string;
  logoUrl: string | null;
  showOverview: boolean;
  showCampaigns: boolean;
  showReports: boolean;
  clientOrgId: string;
};

function pathForSection(orgId: string, section: ClientPortalSection) {
  if (section === "overview") return `/client/${orgId}/overview`;
  return `/client/${orgId}/${section}`;
}

export function ClientPortalChrome({
  orgId,
  children,
  activeSection,
}: {
  orgId: string;
  children: React.ReactNode;
  /** When set, redirects away if agency disabled this section (after branding loads). */
  activeSection?: ClientPortalSection;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [b, setB] = useState<Branding | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/client/branding", { credentials: "include", cache: "no-store" });
    if (!r.ok) return;
    const data = (await r.json()) as Branding;
    setB(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!b || !activeSection || !orgId) return;
    const allowed: Record<ClientPortalSection, boolean> = {
      overview: b.showOverview !== false,
      campaigns: b.showCampaigns !== false,
      reports: b.showReports !== false,
    };
    if (allowed[activeSection]) return;
    const order: ClientPortalSection[] = ["overview", "campaigns", "reports"];
    const next = order.find((s) => allowed[s]);
    if (next) router.replace(pathForSection(orgId, next));
  }, [b, activeSection, orgId, router]);

  const primary = b?.primaryColor ?? "#0ea5e9";
  const pageBg = b?.backgroundColor ?? "#f8fafc";
  const pageText = b?.textColor ?? "#0f172a";
  const headerBg = b?.colorScheme === "DARK" ? "#0f172a" : "#ffffff";
  const headerBorder = b?.colorScheme === "DARK" ? "#1f2937" : "#e5e7eb";
  const muted = b?.colorScheme === "DARK" ? "#9ca3af" : "#6b7280";
  const title = b?.displayName?.trim() || "Your dashboard";

  const nav = [
    b?.showOverview !== false ? { href: `/client/${orgId}/overview`, label: "Overview" } : null,
    b?.showCampaigns !== false ? { href: `/client/${orgId}/campaigns`, label: "Campaigns" } : null,
    b?.showReports !== false ? { href: `/client/${orgId}/reports`, label: "Reports" } : null,
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div style={{ ["--cp-primary" as string]: primary, backgroundColor: pageBg, color: pageText }}>
      <header className="border-b" style={{ backgroundColor: headerBg, borderColor: headerBorder }}>
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {b?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logoUrl} alt={title} className="h-9 w-auto max-w-[140px] object-contain" />
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: primary }}
              >
                {title.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold" style={{ color: pageText }}>{title}</p>
              <p className="text-xs" style={{ color: muted }}>View-only reporting</p>
            </div>
          </div>
          {nav.length > 0 && (
            <nav className="-mx-1 flex gap-1 overflow-x-auto overflow-y-hidden pb-1 sm:mx-0 sm:flex-wrap sm:pb-0">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold"
                  style={
                    pathname === item.href
                      ? { backgroundColor: primary, color: "#ffffff" }
                      : { color: muted }
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8" style={{ color: pageText }}>
        {children}
      </main>
    </div>
  );
}
