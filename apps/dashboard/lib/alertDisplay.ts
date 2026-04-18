import { platformLabel } from "@/lib/campaignDisplay";

export type SeverityUi = "CRITICAL" | "WARNING" | "INFO";

export function severityBadgeLabel(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "Critical";
    case "WARNING":
      return "Warning";
    case "INFO":
      return "Info";
    default:
      return severity;
  }
}

export function badgeClassForSeverity(severity: string, isRead: boolean): string {
  if (isRead) return "bg-neutral-200 text-neutral-700";
  switch (severity) {
    case "CRITICAL":
      return "bg-red-600 text-white";
    case "WARNING":
      return "bg-amber-100 text-amber-900";
    case "INFO":
      return "bg-sky-100 text-sky-900";
    default:
      return "bg-neutral-200 text-neutral-700";
  }
}

export function formatAlertMeta(a: {
  campaignName: string | null;
  platform: string | null;
  createdAt: string;
}): string {
  const camp = a.campaignName ?? "—";
  const plat = a.platform ? platformLabel(a.platform) : "—";
  const time = formatRelativeTime(a.createdAt);
  return `${camp} · ${plat} · ${time}`;
}

export function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
