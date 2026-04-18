import type { PlatformBudgetNumbers } from "@/types/budget";

/** Default platform keys and display order for budget UI. */
export const BUDGET_PLATFORM_ORDER = [
  "FACEBOOK",
  "INSTAGRAM",
  "GOOGLE",
  "LINKEDIN",
  "YOUTUBE",
] as const;

export const BUDGET_PLATFORM_COLORS: Record<string, string> = {
  FACEBOOK: "#1877F2",
  INSTAGRAM: "#E4405F",
  GOOGLE: "#4285F4",
  LINKEDIN: "#0A66C2",
  YOUTUBE: "#FF0000",
};

export function normalizePlatforms(raw: Record<string, unknown>): Record<string, PlatformBudgetNumbers> {
  const out: Record<string, PlatformBudgetNumbers> = {};
  for (const key of BUDGET_PLATFORM_ORDER) {
    const v = raw[key];
    if (v && typeof v === "object" && v !== null) {
      const o = v as Record<string, unknown>;
      const allocated = typeof o.allocated === "number" ? o.allocated : 0;
      const spent = typeof o.spent === "number" ? o.spent : 0;
      out[key] = { allocated, spent };
    } else {
      out[key] = { allocated: 0, spent: 0 };
    }
  }
  return out;
}

export function platformsToJson(p: Record<string, PlatformBudgetNumbers>): Record<string, { allocated: number; spent: number }> {
  const out: Record<string, { allocated: number; spent: number }> = {};
  for (const [k, v] of Object.entries(p)) {
    out[k] = { allocated: v.allocated, spent: v.spent };
  }
  return out;
}

export function sumSpent(platforms: Record<string, PlatformBudgetNumbers>): number {
  return Object.values(platforms).reduce((s, p) => s + p.spent, 0);
}

export function sumAllocated(platforms: Record<string, PlatformBudgetNumbers>): number {
  return Object.values(platforms).reduce((s, p) => s + p.allocated, 0);
}
