import { cx } from '../../lib/tone.js';

/** Pill tab strip used for the mentee sub-navigation and timeline filters. */
export function Tabs({ items, value, onChange, className, size = 'md' }) {
  return (
    <div
      role="tablist"
      className={cx('flex flex-wrap items-center gap-1.5', className)}
    >
      {items.map((item) => {
        const key = typeof item === 'string' ? item : item.value;
        const label = typeof item === 'string' ? item : item.label;
        const selected = key === value;

        return (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(key)}
            className={cx(
              'focus-ring rounded-full font-semibold transition',
              size === 'sm' ? 'px-3 py-1.5 text-[11.5px]' : 'px-3.5 py-2 text-xs',
              selected
                ? 'bg-ink text-white'
                : 'text-muted hover:bg-white hover:text-ink',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
