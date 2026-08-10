import { cx } from '../../lib/tone.js';

export function Skeleton({ className }) {
  return <div className={cx('skeleton', className)} />;
}

/** Placeholder grid matching the dashboards' reveal layout. */
export function DashboardSkeleton({ tiles = 4 }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-9 w-72" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: tiles }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-card" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-card lg:col-span-2" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}
