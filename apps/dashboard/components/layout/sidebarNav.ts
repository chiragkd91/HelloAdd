import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  FileText,
  Home,
  Layers,
  Megaphone,
  Plug,
  Settings,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
  Receipt,
} from "lucide-react";

export type SidebarNavItem = { href: string; label: string; icon: LucideIcon };

export const SIDEBAR_NAV: SidebarNavItem[] = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/market-pulse", label: "Marketing trends", icon: TrendingUp },
  { href: "/agency", label: "Agency", icon: Building2 },
  { href: "/agency/plans", label: "Plans", icon: Layers },
  { href: "/agency/billing", label: "Agency billing", icon: Receipt },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/scheduler", label: "Scheduler", icon: CalendarClock },
  { href: "/errors", label: "AI Errors", icon: ShieldAlert },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/team", label: "Team", icon: Users },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function planLabel(plan: string): string {
  if (!plan) return "Starter";
  if (plan === "TRIAL") return "Trial";
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}
