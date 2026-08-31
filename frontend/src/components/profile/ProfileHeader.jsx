import { Avatar } from '../ui/Avatar.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Card } from '../ui/Card.jsx';
import { DefinitionList } from '../ui/DefinitionList.jsx';
import { cx, tone as toneOf } from '../../lib/tone.js';

/**
 * The record book's cover page, shown at the top of every signed-in view.
 * `stats` are the at-a-glance chips; `fields` the full identity table.
 */
export function ProfileHeader({
  initials,
  name,
  subtitle,
  meta,
  stats = [],
  fields = [],
  aside,
  seed = 0,
  collapsible = true,
  defaultOpen = true,
}) {
  return (
    <Card as="header" className="overflow-hidden">
      <div className="flex flex-wrap items-start gap-5 p-6 lg:p-7">
        <Avatar initials={initials} size="lg" seed={seed} />

        <div className="min-w-0 flex-1">
          <h2 className="hero-title">
            {name}
          </h2>
          {subtitle && <p className="mt-1 text-[13px] text-muted-strong">{subtitle}</p>}
          {meta && <p className="mt-0.5 text-[12px] text-muted">{meta}</p>}

          {stats.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {stats.map((stat) => (
                <Badge key={stat.label} tone={stat.tone} size="md">
                  <span className="font-normal opacity-70">{stat.label}</span>
                  <span className="tnum">{stat.value}</span>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {aside && <div className="shrink-0">{aside}</div>}
      </div>

      {fields.length > 0 &&
        (collapsible ? (
          <details open={defaultOpen} className="group border-t border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-[12px] font-semibold text-muted transition hover:text-ink lg:px-6">
              Full profile
              <span
                aria-hidden="true"
                className="text-[10px] transition group-open:rotate-180"
              >
                ▼
              </span>
            </summary>
            <div className="border-t border-line bg-canvas/50 px-5 py-5 lg:px-6">
              <DefinitionList items={fields} columns={4} />
            </div>
          </details>
        ) : (
          <div className="border-t border-line bg-canvas/50 px-5 py-5 lg:px-6">
            <DefinitionList items={fields} columns={4} />
          </div>
        ))}
    </Card>
  );
}

/** The health chip that sits in the header's `aside` slot. */
export function HealthDial({ index, tone, label }) {
  const t = toneOf(tone);
  return (
    <div className={cx('rounded-2xl px-6 py-4 text-center shadow-inner transition-all duration-300', t.bg, t.border, 'border')}>
      <div className="flex items-baseline justify-center gap-1">
        <span className={cx('tnum font-display text-[38px] font-semibold leading-none', t.text)}>
          {index}
        </span>
        <span className="text-xs font-semibold text-muted-soft">/100</span>
      </div>
      <p className={cx('mt-1.5 text-[11.5px] font-semibold', t.text)}>{label}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[.07em] text-muted-soft">Health Index</p>
    </div>
  );
}
