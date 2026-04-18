import type { ReactNode } from "react";

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex rounded-btn bg-[hsla(60,20%,98%,0.5)] px-2 py-0.5 text-small font-bold text-plum ${className}`}
    >
      {children}
    </span>
  );
}
