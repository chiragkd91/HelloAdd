/** Placeholder while a Recharts card chunk loads (overview & heavy pages). */
export function ChartCardSkeleton({ tall = true }: { tall?: boolean }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
      <div className="ha-skeleton h-4 w-40" />
      <div className="ha-skeleton mt-2 h-3 w-28" />
      <div className={`ha-skeleton mt-4 w-full rounded-lg ${tall ? "h-64" : "h-48"}`} />
    </div>
  );
}
