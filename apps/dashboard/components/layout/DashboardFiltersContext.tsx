"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "helloadd-dashboard-filters";

export type DashboardRangeDays = 7 | 14 | 30 | 60 | 90;

export type DashboardFiltersState = {
  /** Rolling window for analytics & charts (1–90). */
  rangeDays: DashboardRangeDays;
  /** Mongo platform enum, or "" for all platforms. */
  platform: string;
};

type DashboardFiltersContextValue = DashboardFiltersState & {
  setRangeDays: (d: DashboardRangeDays) => void;
  setPlatform: (p: string) => void;
};

const defaultState: DashboardFiltersState = {
  rangeDays: 30,
  platform: "",
};

const DashboardFiltersContext = createContext<DashboardFiltersContextValue | null>(null);

function readStored(): Partial<DashboardFiltersState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Record<string, unknown>;
    const rangeDays = Number(j.rangeDays);
    const platform = typeof j.platform === "string" ? j.platform : "";
    const rd = [7, 14, 30, 60, 90].includes(rangeDays)
      ? (rangeDays as DashboardRangeDays)
      : undefined;
    return {
      ...(rd !== undefined ? { rangeDays: rd } : {}),
      platform,
    };
  } catch {
    return null;
  }
}

export function DashboardFiltersProvider({ children }: { children: React.ReactNode }) {
  const [rangeDays, setRangeDaysState] = useState<DashboardRangeDays>(defaultState.rangeDays);
  const [platform, setPlatformState] = useState(defaultState.platform);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = readStored();
    if (s?.rangeDays !== undefined) setRangeDaysState(s.rangeDays);
    if (s?.platform !== undefined) setPlatformState(s.platform);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ rangeDays, platform })
    );
  }, [hydrated, rangeDays, platform]);

  const setRangeDays = useCallback((d: DashboardRangeDays) => {
    setRangeDaysState(d);
  }, []);

  const setPlatform = useCallback((p: string) => {
    setPlatformState(p);
  }, []);

  const value = useMemo(
    () => ({
      rangeDays,
      platform,
      setRangeDays,
      setPlatform,
    }),
    [rangeDays, platform, setRangeDays, setPlatform]
  );

  return (
    <DashboardFiltersContext.Provider value={value}>
      {children}
    </DashboardFiltersContext.Provider>
  );
}

export function useDashboardFilters(): DashboardFiltersContextValue {
  const ctx = useContext(DashboardFiltersContext);
  if (!ctx) {
    throw new Error("useDashboardFilters must be used within DashboardFiltersProvider");
  }
  return ctx;
}
