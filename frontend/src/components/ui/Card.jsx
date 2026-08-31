import { cx } from '../../lib/tone.js';

/** The surface every dashboard panel sits on. */
export function Card({ className, children, as: Tag = 'section', interactive = false, ...rest }) {
  return (
    <Tag
      className={cx(interactive ? 'card-interactive' : 'card-surface', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <header className={cx('card-header', className)}>
      <div className="min-w-0">
        <h3 className="section-title">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function CardBody({ className, children }) {
  return <div className={cx('p-6', className)}>{children}</div>;
}
