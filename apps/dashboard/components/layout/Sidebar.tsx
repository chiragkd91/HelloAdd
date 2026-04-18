"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { initialsFromName } from "@/lib/auth-initials";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { planLabel, SIDEBAR_NAV } from "@/components/layout/sidebarNav";
import { useSidebarNav } from "@/components/layout/SidebarContext";
import { useUnreadAlertCount } from "@/hooks/useUnreadAlertCount";
import { memo } from "react";

type SidebarProps = {
  /** Drawer: full nav, close control — used inside mobile overlay. */
  variant?: "desktop" | "drawer";
  onDrawerClose?: () => void;
};

export const Sidebar = memo(function Sidebar({ variant = "desktop", onDrawerClose }: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarNav();
  const { unread: unreadAlerts } = useUnreadAlertCount();
  const { user, organizations, status } = useAuth();
  const primaryOrg = organizations[0];
  const displayName = user?.name ?? (status === "loading" ? "…" : "Account");
  const orgLine = primaryOrg?.name ?? (status === "loading" ? "…" : "Workspace");
  const sidebarInitials =
    status === "loading" ? "…" : user ? initialsFromName(user.name) : "?";
  const planBadge = primaryOrg ? planLabel(primaryOrg.plan) : "Starter";
  const trialEndsAt = primaryOrg?.trialEndsAt ? new Date(primaryOrg.trialEndsAt) : null;
  const trialDaysLeft =
    primaryOrg?.plan === "TRIAL" && trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
      : null;

  const isDrawer = variant === "drawer";
  const showLabels = isDrawer || !collapsed;

  return (
    <div
      className={`flex h-full flex-col bg-white transition-[width] duration-200 ${
        isDrawer ? "w-full min-w-[240px]" : collapsed ? "w-[72px]" : "w-full min-w-[240px]"
      }`}
    >
      {isDrawer ? (
        <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-4">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-neutral-900"
            onClick={onDrawerClose}
          >
            Hello Add
          </Link>
          <button
            type="button"
            onClick={onDrawerClose}
            className="ml-auto rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : collapsed ? (
        <div className="flex items-center justify-center border-b border-neutral-200 px-3 py-4">
          <button
            type="button"
            onClick={toggle}
            className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900">
            Hello Add
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="ml-auto rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 lg:ml-0"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      )}

      {showLabels && (
        <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-primary/20 text-sm font-bold text-primary">
            {sidebarInitials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">{displayName}</p>
            <p className="truncate text-xs text-neutral-600">{orgLine}</p>
          </div>
        </div>
      )}

      <nav
        className="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-2 py-2"
        aria-label="Main"
      >
        {SIDEBAR_NAV.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          const badge =
            item.href === "/errors" && unreadAlerts != null && unreadAlerts > 0
              ? unreadAlerts > 99
                ? "99+"
                : unreadAlerts
              : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!showLabels ? item.label : undefined}
              onClick={onDrawerClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                !showLabels ? "justify-center" : ""
              } ${
                active
                  ? "bg-primary/10 text-primary ring-1 ring-primary/15"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              <span className="relative shrink-0">
                <Icon className="h-5 w-5" aria-hidden />
                {badge != null && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-0.5 text-[11px] font-bold leading-none text-white">
                    {badge}
                  </span>
                )}
              </span>
              {showLabels && <span className="min-w-0 text-[13px]">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-neutral-200 px-3 py-4">
        {showLabels ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-800">
                {planBadge}
              </span>
              {trialDaysLeft != null && (
                <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                  {trialDaysLeft}d trial left
                </span>
              )}
            </div>
            <Link
              href="/settings?tab=Billing"
              className="mt-3 flex w-full items-center justify-center rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-hover"
            >
              Upgrade
            </Link>
          </>
        ) : (
          <Link
            href="/settings?tab=Billing"
            className="flex w-full justify-center rounded-xl bg-primary py-2 text-xs font-bold text-white"
            title="Upgrade"
          >
            ↑
          </Link>
        )}
      </div>
    </div>
  );
});
