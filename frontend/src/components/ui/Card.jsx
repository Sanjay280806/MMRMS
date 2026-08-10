import { cx } from '../../lib/tone.js';

/** The surface every dashboard panel sits on. */
export function Card({ className, children, as: Tag = 'section', ...rest }) {
  return (
    <Tag
      className={cx(
        'rounded-card border border-line bg-white shadow-card',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <header
      className={cx(
        'flex items-start justify-between gap-4 border-b border-line px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function CardBody({ className, children }) {
  return <div className={cx('p-5', className)}>{children}</div>;
}
