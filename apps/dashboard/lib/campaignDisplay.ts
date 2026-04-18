/** Map Mongo enum values to dashboard copy used in filters and tables. */

export const PLATFORM_OPTIONS = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "GOOGLE", label: "Google" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "YOUTUBE", label: "YouTube" },
] as const;

const PLATFORM_LABEL: Record<string, string> = Object.fromEntries(
  PLATFORM_OPTIONS.map((o) => [o.value, o.label])
);

export function platformLabel(platform: string): string {
  return PLATFORM_LABEL[platform] ?? platform;
}

export function statusLabel(status: string): string {
  switch (status) {
    case "LIVE":
      return "Live";
    case "PAUSED":
      return "Paused";
    case "ENDED":
      return "Ended";
    case "DRAFT":
      return "Draft";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

export function formatInr(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatImpressions(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function campaignHasError(c: { errorType: string }): boolean {
  return c.errorType !== "NONE";
}
