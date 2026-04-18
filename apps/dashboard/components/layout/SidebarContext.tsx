"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type SidebarNavContextValue = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
};

const SidebarNavContext = createContext<SidebarNavContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const value = useMemo(
    () => ({
      collapsed,
      toggle: () => setCollapsed((c) => !c),
      setCollapsed,
      mobileMenuOpen,
      setMobileMenuOpen,
      openMobileMenu: () => setMobileMenuOpen(true),
      closeMobileMenu: () => setMobileMenuOpen(false),
    }),
    [collapsed, mobileMenuOpen],
  );

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  return <SidebarNavContext.Provider value={value}>{children}</SidebarNavContext.Provider>;
}

export function useSidebarNav() {
  const ctx = useContext(SidebarNavContext);
  if (!ctx) throw new Error("useSidebarNav must be used within SidebarProvider");
  return ctx;
}
