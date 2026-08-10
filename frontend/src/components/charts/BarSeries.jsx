import { cx } from '../../lib/tone.js';

/**
 * Vertical bars for SGPA-by-semester. Bars are scaled between `floor` and
 * `ceiling` rather than 0, so small GPA differences stay legible.
 */
export function BarSeries({ data, floor = 5, ceiling = 10, className }) {
  return (
    <div className={cx('flex items-end gap-3', className)}>
      {data.map((d, i) => {
        const height = Math.max(8, ((d.value - floor) / (ceiling - floor)) * 100);
        const isLatest = i === data.length - 1;

        return (
          <div key={d.semester} className="flex flex-1 flex-col items-center gap-2">
            <span className="tnum text-[11px] font-semibold text-ink">{d.value.toFixed(1)}</span>
            <div className="flex h-28 w-full items-end">
              <div
                className={cx(
                  'w-full rounded-t-md transition-[height] duration-700 ease-out',
                  isLatest ? 'bg-brand-500' : 'bg-brand-200',
                )}
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-soft">S{d.semester}</span>
          </div>
        );
      })}
    </div>
  );
}
