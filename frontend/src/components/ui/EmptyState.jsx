import { cx } from '../../lib/tone.js';

/** Every list renders this instead of collapsing when it has nothing to show. */
export function EmptyState({ title, description, icon = '○', className, action }) {
  return (
    <div className={cx('px-5 py-12 text-center', className)}>
      <div
        aria-hidden="true"
        className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-canvas text-lg text-muted-soft"
      >
        {icon}
      </div>
      <p className="text-[13.5px] font-semibold text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-relaxed text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
