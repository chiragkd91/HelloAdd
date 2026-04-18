import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  className?: string;
};

/** Warm wash badge — Pinterest-style subtle surface */
export function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-btn bg-[hsla(60,20%,98%,0.5)] px-2.5 py-1 text-xs font-bold text-neutral-900 md:text-sm ${className}`}
    >
      {children}
    </span>
  );
}
