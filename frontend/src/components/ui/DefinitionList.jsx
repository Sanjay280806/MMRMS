import { cx } from '../../lib/tone.js';

/**
 * Key/value grid — the record book's field tables. `items` is
 * `[{ key, value, span }]`; a falsy value renders as an em dash.
 */
export function DefinitionList({ items, columns = 2, className }) {
  const cols = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <dl className={cx('grid grid-cols-1 gap-x-6 gap-y-4', cols, className)}>
      {items.map((item) => (
        <div key={item.key} className={item.span ? 'sm:col-span-2 lg:col-span-3' : undefined}>
          <dt className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
            {item.key}
          </dt>
          <dd className="mt-1 text-[13px] leading-relaxed text-ink">
            {item.value || <span className="text-muted-soft">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
