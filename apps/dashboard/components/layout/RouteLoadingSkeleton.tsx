/** Skeleton shown while a dashboard route chunk loads (instant feedback on navigation). */
export function RouteLoadingSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading page">
      <div>
        <div className="ha-skeleton h-9 w-48 max-w-full" />
        <div className="ha-skeleton mt-3 h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="ha-skeleton h-3 w-24" />
            <div className="ha-skeleton mt-4 h-8 w-32" />
            <div className="ha-skeleton mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="ha-skeleton h-4 w-40" />
          <div className="ha-skeleton mt-6 h-64 w-full" />
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="ha-skeleton h-4 w-36" />
          <div className="ha-skeleton mt-6 h-64 w-full" />
        </div>
      </div>
      <div className="ha-skeleton h-48 w-full rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm" />
    </div>
  );
}
