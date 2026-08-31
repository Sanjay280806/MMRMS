import { cx } from '../../lib/tone.js';
import { Card, CardBody } from './Card.jsx';

/**
 * A record-book section. The eyebrow carries the printed section number so a
 * screen maps unambiguously onto a page of the physical book.
 */
export function SectionCard({ title, subtitle, action, children, bodyClassName, className }) {
  return (
    <Card className={className}>
      <header className="card-header">
        <div className="min-w-0">
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <CardBody className={bodyClassName}>{children}</CardBody>
    </Card>
  );
}

/** Section card without the body padding, for tables that bleed to the edge. */
export function SectionTable({ title, subtitle, action, children, className }) {
  return (
    <Card className={className}>
      <header className="card-header">
        <div className="min-w-0">
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </Card>
  );
}
