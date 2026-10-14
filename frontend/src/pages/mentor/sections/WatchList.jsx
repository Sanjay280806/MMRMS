import { Avatar } from '../../../components/ui/Avatar.jsx';
import { Badge, HealthBadge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { DataTable } from '../../../components/ui/DataTable.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { SectionTable } from '../../../components/ui/SectionCard.jsx';

/**
 * One roster-wide watch list. `metric` names the column the list is sorted by,
 * so Attendance, Arrears, Well-being and Overdue Meetings share this component.
 */
export function WatchList({ section, title, subtitle, mentees, onOpen, metric, detail, emptyTitle, showHealth = true }) {
  return (
    <SectionTable
      section={section}
      title={title}
      subtitle={subtitle}
      action={<Badge tone={mentees.length ? 'amber' : 'green'} size="md">{mentees.length} student{mentees.length === 1 ? '' : 's'}</Badge>}
    >
      <DataTable
        rows={mentees}
        rowKey={(m) => m.id}
        onRowClick={(m) => onOpen(m.id)}
        empty={<EmptyState title={emptyTitle} description="Nothing needs your attention here." icon="✓" />}
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
            key: 'metric',
            header: mentees.length && mentees[0] ? metric(mentees[0]).label : 'Metric',
            align: 'right',
            render: (m) => {
              const value = metric(m);
              return <Badge tone={value.tone}>{value.value}</Badge>;
            },
          },
          ...(showHealth ? [{ key: 'health', header: 'Health', align: 'right', render: (m) => <HealthBadge value={m.health} tone={m.healthTone} /> }] : []),
          { key: 'detail', header: 'Detail', align: 'right', render: (m) => <span className="text-[12px] text-muted">{detail(m)}</span> },
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
                  onOpen(m.id);
                }}
              >
                Open
              </Button>
            ),
          },
        ]}
      />
    </SectionTable>
  );
}
