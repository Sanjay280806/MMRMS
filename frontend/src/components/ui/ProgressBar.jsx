import { cx, tone as toneOf } from '../../lib/tone.js';

/** Horizontal meter. `label`/`value` render the row above the track. */
export function ProgressBar({
  percent,
  tone = 'indigo',
  label,
  value,
  className,
  trackClassName,
  height = 'h-2',
}) {
  const t = toneOf(tone);
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={className}>
      {(label || value != null) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && <span className="text-[12.5px] text-muted-strong">{label}</span>}
          {value != null && (
            <span className="tnum text-[12.5px] font-semibold text-ink">{value}</span>
          )}
        </div>
      )}
      <div
        className={cx('overflow-hidden rounded-full bg-line shadow-inner', height, trackClassName)}
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={typeof label === 'string' ? label : undefined}
      >
        <div
          className={cx('h-full rounded-full transition-[width] duration-700 ease-out', t.solid)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
