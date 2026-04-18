export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-btn bg-sand ${className}`} aria-hidden />;
}
