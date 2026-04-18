type CardProps = {
  children: React.ReactNode;
  className?: string;
  /**
   * - default — white surface (pricing, etc.)
   * - sidebarRow — dark nav/list strip (dashboard mockup)
   * - metric — purple gradient KPI tile
   * — chartShell — dark chart/report container
   */
  variant?: "default" | "sidebarRow" | "metric" | "chartShell";
};

const variantClasses: Record<NonNullable<CardProps["variant"]>, string> = {
  default: "rounded-2xl border border-neutral-200 bg-white shadow-none",
  sidebarRow:
    "rounded-xl border border-neutral-700/60 bg-neutral-800/95 shadow-inner shadow-black/20",
  metric:
    "rounded-xl border border-primary/30 bg-gradient-to-br from-primary via-[#5c3d99] to-primary-hover shadow-md shadow-primary/25",
  chartShell:
    "rounded-2xl border border-neutral-800 bg-neutral-950/95 shadow-inner shadow-black/30",
};

export function Card({ children, className = "", variant = "default" }: CardProps) {
  return <div className={`${variantClasses[variant]} ${className}`.trim()}>{children}</div>;
}
