import type { ReactNode } from "react";
import { AuthBrandingPanel } from "./AuthBrandingPanel";

type AuthSplitLayoutProps = {
  children: ReactNode;
  /** Full viewport height — use for standalone login (no marketing navbar/footer) */
  standalone?: boolean;
};

export function AuthSplitLayout({ children, standalone }: AuthSplitLayoutProps) {
  return (
    <div
      className={
        standalone
          ? "grid min-h-screen flex-1 grid-cols-1 lg:grid-cols-2"
          : "grid min-h-0 flex-1 grid-cols-1 lg:min-h-[calc(100vh-8rem)] lg:grid-cols-2"
      }
    >
      <AuthBrandingPanel />
      <div className="flex flex-col justify-center bg-white px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
