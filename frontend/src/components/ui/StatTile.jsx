import { cx } from '../../lib/tone.js';
import { useCountUp } from '../../hooks/useCountUp.js';
import { Card } from './Card.jsx';

/**
 * Headline metric tile. `value` counts up on mount; `suffix` and `footer`
 * carry the units and supporting line.
 */
export function StatTile({ label, value, suffix, decimals = 0, footer, aside, className }) {
  const animated = useCountUp(value, { decimals });
  const display = typeof value === 'number' ? animated.toFixed(decimals) : value;

  return (
    <Card className={cx('flex flex-col justify-between p-6', className)} as="div" interactive>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12.5px] font-medium text-muted">{label}</span>
        {aside}
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="tnum font-display text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink">
          {display}
        </span>
        {suffix && <span className="text-sm font-semibold text-muted-soft">{suffix}</span>}
      </div>
      {footer && <div className="mt-3 text-[12px] leading-relaxed text-muted">{footer}</div>}
    </Card>
  );
}
