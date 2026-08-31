import { cx } from '../../lib/tone.js';

/** Every list renders this instead of collapsing when it has nothing to show. */
export function EmptyState({ title, description, icon = '○', className, action }) {
  return (
    <div className={cx('px-6 py-14 text-center', className)}>
      <div
        aria-hidden="true"
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient-subtle text-lg text-brand-500 shadow-inner"
      >
        {icon}
      </div>
      <p className="text-[13.5px] font-semibold text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
