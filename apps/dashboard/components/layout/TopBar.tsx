"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  type DashboardRangeDays,
  useDashboardFilters,
} from "@/components/layout/DashboardFiltersContext";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { useSidebarNav } from "@/components/layout/SidebarContext";
import { initialsFromName } from "@/lib/auth-initials";
import { PLATFORM_OPTIONS } from "@/lib/campaignDisplay";
import { useUnreadAlertCount } from "@/hooks/useUnreadAlertCount";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarRange, ChevronDown, Layers, Menu, Search, X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

const segmentLabels: Record<string, string> = {
  "": "Overview",
  campaigns: "Campaigns",
  budget: "Budget",
  analytics: "Analytics",
  "market-pulse": "Marketing trends",
  calendar: "Calendar",
  agency: "Agency",
  errors: "AI Errors",
  reports: "Reports",
  team: "Team",
  integrations: "Integrations",
  settings: "Settings",
};

const RANGE_OPTIONS: { value: DashboardRangeDays; label: string }[] = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 60, label: "Last 60 days" },
  { value: 90, label: "Last 90 days" },
];

function breadcrumbs(pathname: string | null) {
  const parts = (pathname || "/").split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [{ href: "/", label: "Dashboard" }];
  let acc = "";
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    acc += `/${p}`;
    const prev = parts[i - 1];
    const label =
      segmentLabels[p] ??
      (prev === "campaigns" ? "Campaign" : prev === "scheduler" ? "Post" : p.charAt(0).toUpperCase() + p.slice(1));
    crumbs.push({ href: acc, label });
  }
  return crumbs;
}

export const TopBar = memo(function TopBar() {
  const pathname = usePathname();
  const { user, status, logout } = useAuth();
  const { unread } = useUnreadAlertCount();
  const { rangeDays, platform, setRangeDays, setPlatform } = useDashboardFilters();
  const { openMobileMenu } = useSidebarNav();
  const displayName = user?.name ?? (status === "loading" ? "…" : "Account");
  const avatarLetters =
    status === "loading" ? "…" : user ? initialsFromName(user.name) : "?";
  const crumbs = breadcrumbs(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const notifCount = unread == null ? 0 : unread;
  const showNotifBadge = notifCount > 0;

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileSearchOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileSearchOpen]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener("click", close);
    }
    return () => document.removeEventListener("click", close);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileSearchOpen]);

  return (
    <header className="shrink-0 border-b border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={openMobileMenu}
            className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100"
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
          <Link href="/" className="truncate text-base font-bold tracking-tight text-neutral-900">
            Hello Add
          </Link>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/errors"
            className="relative shrink-0 rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Notifications and alerts"
          >
            <Bell className="h-6 w-6" />
            {showNotifBadge && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-0.5 text-[11px] font-bold leading-none text-white">
                {notifCount > 99 ? "99+" : notifCount}
              </span>
            )}
          </Link>
          <div className="relative" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-primary/20 text-xs font-bold text-primary"
              aria-label="Open account menu"
            >
              {avatarLetters}
            </button>
            {mobileMenuOpen && (
              <div className="absolute right-0 z-50 mt-1 min-w-[160px] rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                <Link
                  href="/settings"
                  className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void logout();
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hidden border-b border-neutral-200 lg:grid lg:grid-cols-[1fr_minmax(0,24rem)_auto] lg:items-center lg:gap-4 lg:px-8 lg:py-3">
        <nav className="min-w-0" aria-label="Breadcrumb">
          <div className="flex flex-wrap items-center gap-1 text-sm text-neutral-600">
            {crumbs.map((c, i) => (
              <span key={`${c.href}-${i}`} className="flex items-center gap-1">
                {i > 0 && <span className="text-neutral-300">/</span>}
                {i === crumbs.length - 1 ? (
                  <span className="font-semibold text-neutral-900">{c.label}</span>
                ) : (
                  <Link href={c.href} className="hover:text-primary">
                    {c.label}
                  </Link>
                )}
              </span>
            ))}
          </div>
        </nav>

        <div className="relative max-w-xl justify-self-center">
          <GlobalSearch />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="hidden sm:inline">Range</span>
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays(Number(e.target.value) as DashboardRangeDays)}
              className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm font-medium text-neutral-900"
              aria-label="Date range"
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="hidden sm:inline">Platform</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm font-medium text-neutral-900"
              aria-label="Platform filter"
            >
              <option value="">All</option>
              {PLATFORM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <Link
            href="/errors"
            className="relative rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Notifications and alerts"
          >
            <Bell className="h-5 w-5" />
            {showNotifBadge && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-0.5 text-[11px] font-bold leading-none text-white">
                {notifCount > 99 ? "99+" : notifCount}
              </span>
            )}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-primary/20 text-xs font-bold text-primary">
                {avatarLetters}
              </span>
              <span className="hidden max-w-[10rem] truncate sm:inline">{displayName}</span>
              <ChevronDown className="h-4 w-4 text-neutral-600" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 z-50 mt-1 min-w-[180px] rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
                role="menu"
              >
                <Link
                  href="/settings"
                  className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    void logout();
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 px-4 py-2.5 lg:hidden">
        <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 sm:max-w-[11rem]">
          <CalendarRange className="h-4 w-4 shrink-0 text-neutral-600" aria-hidden />
          <span className="sr-only">Date range</span>
          <select
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value) as DashboardRangeDays)}
            className="min-w-0 flex-1 border-0 bg-transparent py-0.5 text-[11px] font-medium text-neutral-900 focus:outline-none focus:ring-0"
            aria-label="Date range"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 sm:max-w-[11rem]">
          <Layers className="h-4 w-4 shrink-0 text-neutral-600" aria-hidden />
          <span className="sr-only">Platform</span>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent py-0.5 text-[11px] font-medium text-neutral-900 focus:outline-none focus:ring-0"
            aria-label="Platform filter"
          >
            <option value="">All</option>
            {PLATFORM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setMobileSearchOpen(true)}
          className="flex shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white p-2 text-neutral-800 hover:bg-neutral-50"
          aria-label="Open search"
        >
          <Search className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {mobileSearchOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close search"
            onClick={() => setMobileSearchOpen(false)}
          />
          <div className="absolute left-0 right-0 top-0 max-h-[85vh] overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-neutral-900">Search</span>
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <GlobalSearch />
          </div>
        </div>
      )}
    </header>
  );
});
