import { cx } from '../../lib/tone.js';

/** Pill tab strip used for the mentee sub-navigation and timeline filters. */
export function Tabs({ items, value, onChange, className, size = 'md' }) {
  return (
    <div
      role="tablist"
      className={cx(
        'inline-flex flex-wrap items-center gap-1 rounded-2xl bg-canvas/80 p-1 shadow-inner',
        className,
      )}
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
              'tab-pill',
              size === 'sm' ? 'px-3 py-1.5 text-[11.5px]' : 'px-3.5 py-2 text-xs',
              selected ? 'tab-pill-active' : 'tab-pill-inactive',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
