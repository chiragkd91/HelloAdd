"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
};

export type AuthOrganization = {
  organizationId: string;
  role: string;
  name: string;
  slug: string;
  plan: string;
  onboardingComplete?: boolean;
  trialEndsAt?: string | null;
};

type AuthState = {
  status: "loading" | "authenticated" | "unauthenticated";
  user: AuthUser | null;
  organizations: AuthOrganization[];
};

type AuthContextValue = AuthState & {
  /** Stable user id for analytics, audit logs, and support — only when signed in. */
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<{ user: AuthUser; organizations: AuthOrganization[] } | null> {
  const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
  if (r.status === 401) return null;
  if (!r.ok) return null;
  const data = (await r.json()) as { user: AuthUser; organizations: AuthOrganization[] };
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    organizations: [],
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading" }));
    try {
      const data = await fetchMe();
      if (data) {
        setState({
          status: "authenticated",
          user: data.user,
          organizations: data.organizations ?? [],
        });
      } else {
        setState({ status: "unauthenticated", user: null, organizations: [] });
      }
    } catch {
      setState({ status: "unauthenticated", user: null, organizations: [] });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setState({ status: "unauthenticated", user: null, organizations: [] });
    router.push("/login");
    router.refresh();
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      refresh,
      logout,
    }),
    [state, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Optional hook for components that may render outside provider (should not happen). */
export function useAuthOptional() {
  return useContext(AuthContext);
}
