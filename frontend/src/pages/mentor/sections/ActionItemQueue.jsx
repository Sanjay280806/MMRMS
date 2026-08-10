import { Avatar } from '../../../components/ui/Avatar.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { DataTable } from '../../../components/ui/DataTable.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { SectionTable } from '../../../components/ui/SectionCard.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { useResource } from '../../../hooks/useResource.js';

/** Section 12 across the roster — every action item still open. */
export function ActionItemQueue({ onOpenMentee }) {
  const { data, loading, error } = useResource('/mentor/me/action-items');

  const mine = data?.filter((a) => a.responsible === 'Mentor') ?? [];
  const theirs = data?.filter((a) => a.responsible !== 'Mentor') ?? [];

  return (
    <div className="space-y-5">
      {error && <EmptyState title="Couldn't load action items" description={error.message} icon="!" />}
      {loading && !data && <Skeleton className="h-64 rounded-card" />}

      {data && (
        <>
          <Queue
            title="Owned by you"
            subtitle="Action items you agreed to complete"
            rows={mine}
            onOpenMentee={onOpenMentee}
            emptyTitle="Nothing on your plate"
          />
          <Queue
            title="Owned by students"
            subtitle="Follow these up at the next review"
            rows={theirs}
            onOpenMentee={onOpenMentee}
            emptyTitle="Students have closed everything"
          />
        </>
      )}
    </div>
  );
}

function Queue({ title, subtitle, rows, onOpenMentee, emptyTitle }) {
  return (
    <SectionTable
      section="Section 12"
      title={title}
      subtitle={subtitle}
      action={<Badge tone={rows.length ? 'amber' : 'green'} size="md">{rows.length} open</Badge>}
    >
      <DataTable
        rows={rows}
        rowKey={(a) => a.id}
        onRowClick={(a) => onOpenMentee(a.studentId)}
        empty={<EmptyState title={emptyTitle} description="Nothing outstanding." icon="✓" />}
        columns={[
          {
            key: 'student',
            header: 'Student',
            render: (a, i) => (
              <div className="flex items-center gap-2.5">
                <Avatar initials={a.initials} seed={i} size="sm" />
                <span className="truncate font-medium">{a.student}</span>
              </div>
            ),
          },
          { key: 'task', header: 'Task', className: 'text-muted-strong' },
          {
            key: 'meeting',
            header: 'From',
            align: 'right',
            render: (a) => (
              <span className="tnum text-[12px] text-muted">
                Mtg {a.meetingNumber} · {a.meetingDate}
              </span>
            ),
          },
          { key: 'targetDate', header: 'Target', align: 'right', render: (a) => <span className="tnum">{a.targetDate}</span> },
          { key: 'status', header: 'Status', align: 'right', render: (a) => <Badge tone={a.tone}>{a.status}</Badge> },
        ]}
      />
    </SectionTable>
  );
}
