import type { ReactNode } from "react";

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-card border border-sand ${className}`}>
      <table className="w-full border-collapse text-left text-small">{children}</table>
    </div>
  );
}
