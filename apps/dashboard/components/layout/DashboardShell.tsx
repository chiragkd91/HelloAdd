"use client";

import { DashboardFiltersProvider } from "@/components/layout/DashboardFiltersContext";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider, useSidebarNav } from "@/components/layout/SidebarContext";
import { TopBar } from "@/components/layout/TopBar";

function ShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarNav();

  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-neutral-100">
      <aside
        className={`hidden min-h-0 shrink-0 overflow-hidden border-r border-neutral-200 bg-white transition-[width] duration-200 ease-out lg:flex lg:flex-col ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <Sidebar />
      </aside>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <MobileSidebar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 md:p-6 [scrollbar-gutter:stable]">
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardFiltersProvider>
        <ShellInner>{children}</ShellInner>
      </DashboardFiltersProvider>
    </SidebarProvider>
  );
}
