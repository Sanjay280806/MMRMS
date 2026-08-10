import { cx } from '../../lib/tone.js';
import { Card, CardBody } from './Card.jsx';

/**
 * A record-book section. The eyebrow carries the printed section number so a
 * screen maps unambiguously onto a page of the physical book.
 */
export function SectionCard({ section, title, subtitle, action, children, bodyClassName, className }) {
  return (
    <Card className={className}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          {section && (
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-brand-500">
              {section}
            </p>
          )}
          <h3 className={cx('text-[14.5px] font-semibold tracking-[-0.01em] text-ink', section && 'mt-1')}>
            {title}
          </h3>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <CardBody className={bodyClassName}>{children}</CardBody>
    </Card>
  );
}

/** Section card without the body padding, for tables that bleed to the edge. */
export function SectionTable({ section, title, subtitle, action, children, className }) {
  return (
    <Card className={className}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          {section && (
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-brand-500">{section}</p>
          )}
          <h3 className={cx('text-[14.5px] font-semibold tracking-[-0.01em] text-ink', section && 'mt-1')}>
            {title}
          </h3>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </Card>
  );
}
