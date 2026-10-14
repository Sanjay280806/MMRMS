import { cx, tone as toneOf } from '../../lib/tone.js';

/** Subtle status pill — the app's single label primitive. */
export function Badge({ tone = 'slate', children, className, size = 'sm', animate = false }) {
  const t = toneOf(tone);
  return (
    <span
      className={cx(
        'badge-soft',
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        t.bg,
        t.text,
        t.border,
        'border',
        animate && 'badge-animate',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Numeric health score in a tone-matched pill. */
export function HealthBadge({ value, tone, className }) {
  return (
    <Badge tone={tone} className={cx('tnum', className)}>
      {value}
    </Badge>
  );
}
