/**
 * Shared loading placeholders using `.ha-skeleton` (see `app/globals.css`).
 */

export function ChartInnerSkeleton({
  className = "h-64",
  label = "Loading chart",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`ha-skeleton mt-4 w-full rounded-lg ${className}`}
      aria-busy="true"
      aria-label={label}
    />
  );
}

/** Overview KPI strip + similar 4-card grids */
export function SummaryCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="ha-skeleton h-3 w-24" />
          <div className="ha-skeleton mt-3 h-9 w-36 max-w-full" />
          <div className="ha-skeleton mt-2 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeletonRows({
  rows = 6,
  cols = 9,
  tdClassName = "px-4 py-3",
  getTdClassName,
}: {
  rows?: number;
  cols?: number;
  tdClassName?: string;
  /** Per-column classes (e.g. `hidden md:table-cell` for responsive tables). */
  getTdClassName?: (colIndex: number) => string | undefined;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="border-b border-neutral-100">
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} className={getTdClassName?.(ci) ?? tdClassName}>
              <div className="ha-skeleton h-4 w-full max-w-[10rem]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function AlertCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading alerts">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          aria-hidden
        >
          <div className="ha-skeleton h-4 w-28" />
          <div className="ha-skeleton mt-3 h-4 w-full max-w-md" />
          <div className="ha-skeleton mt-2 h-3 w-48" />
        </div>
      ))}
    </div>
  );
}

export function RegionBarsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="mt-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i}>
          <div className="ha-skeleton mb-1 h-3 w-24" />
          <div className="ha-skeleton h-2 w-full max-w-xs rounded-full" />
        </li>
      ))}
    </ul>
  );
}

export function BudgetPlatformRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="mt-6 space-y-6">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i}>
          <div className="ha-skeleton h-4 w-40" />
          <div className="ha-skeleton mt-3 h-2 w-full rounded-full" />
          <div className="ha-skeleton mt-2 h-3 w-48" />
        </li>
      ))}
    </ul>
  );
}

export function ReportListSkeleton({ items = 4 }: { items?: number }) {
  return (
    <ul className="mt-4 divide-y divide-neutral-100">
      {Array.from({ length: items }).map((_, i) => (
        <li key={i} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <div className="ha-skeleton h-4 w-40" />
            <div className="ha-skeleton mt-2 h-3 w-56" />
            <div className="ha-skeleton mt-2 h-3 w-36" />
          </div>
          <div className="flex gap-2">
            <div className="ha-skeleton h-8 w-14 rounded-lg" />
            <div className="ha-skeleton h-8 w-14 rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  );
}
