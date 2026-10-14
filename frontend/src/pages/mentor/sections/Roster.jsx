import { useState } from 'react';
import { Avatar } from '../../../components/ui/Avatar.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
<<<<<<< HEAD
=======
import { Button } from '../../../components/ui/Button.jsx';
import { DataTable } from '../../../components/ui/DataTable.jsx';
>>>>>>> c98e9442a8f1b50289e2349501411e5624414e54
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { SectionTable } from '../../../components/ui/SectionCard.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { Tabs } from '../../../components/ui/Tabs.jsx';
import { useResource } from '../../../hooks/useResource.js';
import { cx } from '../../../lib/tone.js';

const SORTS = [
  { value: 'risk', label: 'By risk' },
  { value: 'attendance', label: 'By attendance' },
  { value: 'meetings', label: 'By overdue' },
  { value: 'name', label: 'A–Z' },
];

/** The roster. Selecting a student opens that mentee's record book. */
export function Roster({ onOpenMentee }) {
  const [sort, setSort] = useState('risk');
  const { data, loading, error } = useResource(`/mentor/me/mentees?sort=${sort}`);

  return (
    <SectionTable
      title="My Mentees"
      subtitle={data ? `${data.total} students · select one to open their record book` : 'Loading roster…'}
      action={<Tabs size="sm" items={SORTS} value={sort} onChange={setSort} />}
    >
      {error && (
        <div className="p-5">
          <EmptyState title="Couldn't load the roster" description={error.message} icon="!" />
        </div>
      )}

      {loading && !data && (
        <div className="space-y-3 p-5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      )}

      {data?.mentees && (
        <DataTable
          rows={data.mentees}
          rowKey={(m) => m.id}
          onRowClick={(m) => onOpenMentee(m.id)}
          empty={<EmptyState title="No mentees assigned" description="Your coordinator assigns mentees each term." />}
          columns={[
            {
              key: 'name',
              header: 'Student',
              render: (m, i) => (
                <div className="flex items-center gap-3">
                  <Avatar initials={m.initials} seed={i} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className="tnum truncate text-[11.5px] text-muted">
                      {m.rollNumber} · {m.meta}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: 'cgpa',
              header: 'CGPA',
              align: 'right',
              render: (m) => <span className="tnum font-semibold">{m.cgpa.toFixed(1)}</span>,
            },
            {
              key: 'attendance',
              header: 'Attendance',
              align: 'right',
              render: (m) => (
                <Badge tone={m.attendanceBelowRequirement ? 'rose' : 'green'}>
                  {m.attendance}%
                </Badge>
              ),
            },
            {
              key: 'arrears',
              header: 'Arrears',
              align: 'right',
              render: (m) => (
                <span className={cx('tnum font-medium', m.standingArrears ? 'font-semibold text-bad-ink' : 'text-muted-soft')}>
                  {m.standingArrears}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (m) => (
                <div className="flex flex-wrap items-center gap-1.5">
                  {m.flagReason && <Badge tone={m.flagTone}>{m.flagReason}</Badge>}
                  {m.meetingsOverdue > 0 && <Badge tone="rose">{m.meetingsOverdue} overdue</Badge>}
                  {!m.flagReason && !m.meetingsOverdue && (
                    <span className="text-[12px] text-muted-soft">On track</span>
                  )}
                </div>
              ),
            },
            {
              key: 'lastMeeting',
              header: 'Last Met',
              align: 'right',
              render: (m) => <span className="tnum text-[12px] text-muted">{m.lastMeeting}</span>,
            },
            {
              key: 'open',
              header: '',
              align: 'right',
              render: (m) => (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenMentee(m.id);
                  }}
                >
                  Open
                </Button>
              ),
            },
          ]}
        />
      )}
    </SectionTable>
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
