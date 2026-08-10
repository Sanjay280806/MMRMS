import { useState } from 'react';
import { Avatar } from '../../../components/ui/Avatar.jsx';
import { Badge, HealthBadge } from '../../../components/ui/Badge.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { SectionCard } from '../../../components/ui/SectionCard.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { Tabs } from '../../../components/ui/Tabs.jsx';
import { useResource } from '../../../hooks/useResource.js';

const SORTS = [
  { value: 'risk', label: 'By risk' },
  { value: 'attendance', label: 'By attendance' },
  { value: 'meetings', label: 'By overdue' },
  { value: 'name', label: 'A–Z' },
];

/** The roster. Selecting a card opens that mentee's record book. */
export function Roster({ onOpenMentee }) {
  const [sort, setSort] = useState('risk');
  const { data, loading, error } = useResource(`/mentor/me/mentees?sort=${sort}`);

  return (
    <SectionCard
      title="My Mentees"
      subtitle={data ? `${data.total} students · select one to open their record book` : 'Loading roster…'}
      action={<Tabs size="sm" items={SORTS} value={sort} onChange={setSort} />}
    >
      {error && <EmptyState title="Couldn't load the roster" description={error.message} icon="!" />}

      {loading && !data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {data?.mentees.length === 0 && (
        <EmptyState title="No mentees assigned" description="Your coordinator assigns mentees each term." />
      )}

      {data?.mentees.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.mentees.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onOpenMentee(m.id)}
                className="focus-ring flex h-full w-full flex-col rounded-xl border border-line bg-white p-4 text-left transition hover:border-brand-300 hover:shadow-card"
              >
                <div className="flex items-start gap-3">
                  <Avatar initials={m.initials} seed={i} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{m.name}</p>
                    <p className="tnum truncate text-[11.5px] text-muted">{m.rollNumber}</p>
                    <p className="truncate text-[11.5px] text-muted">{m.meta}</p>
                  </div>
                  <HealthBadge value={m.health} tone={m.healthTone} />
                </div>

                <dl className="mt-3.5 grid grid-cols-3 gap-2 border-t border-line pt-3">
                  <Metric label="CGPA" value={m.cgpa.toFixed(1)} />
                  <Metric
                    label="Attendance"
                    value={`${m.attendance}%`}
                    tone={m.attendanceBelowRequirement ? 'text-bad-ink' : undefined}
                  />
                  <Metric
                    label="Arrears"
                    value={m.standingArrears}
                    tone={m.standingArrears ? 'text-bad-ink' : undefined}
                  />
                </dl>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {m.flagReason && <Badge tone={m.flagTone}>{m.flagReason}</Badge>}
                  {m.meetingsOverdue > 0 && <Badge tone="rose">{m.meetingsOverdue} overdue</Badge>}
                  {m.wellbeingConcerns > 0 && <Badge tone="amber">{m.wellbeingConcerns} well-being</Badge>}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-[11.5px]">
                  <span className="tnum text-muted">Last met {m.lastMeeting}</span>
                  <span className="font-semibold text-brand-500">Open record book →</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div>
      <dt className="text-[9.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">{label}</dt>
      <dd className={`tnum mt-0.5 text-[13px] font-semibold ${tone ?? 'text-ink'}`}>{value}</dd>
    </div>
  );
}
