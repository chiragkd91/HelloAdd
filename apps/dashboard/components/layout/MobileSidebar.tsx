"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useSidebarNav } from "@/components/layout/SidebarContext";
import { memo, useEffect } from "react";

function MobileSidebarInner() {
  const { mobileMenuOpen, closeMobileMenu } = useSidebarNav();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMobileMenu();
    }
    if (mobileMenuOpen) {
      window.addEventListener("keydown", onKey);
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen, closeMobileMenu]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  if (!mobileMenuOpen) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/50"
        aria-label="Close menu"
        onClick={closeMobileMenu}
      />
      <div
        className="fixed left-0 top-0 z-50 h-full w-72 max-w-[88vw] border-r border-neutral-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
      >
        <Sidebar variant="drawer" onDrawerClose={closeMobileMenu} />
      </div>
    </>
  );
}

export const MobileSidebar = memo(function MobileSidebar() {
  return <MobileSidebarInner />;
});
