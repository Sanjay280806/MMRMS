import { Avatar } from '../../../components/ui/Avatar.jsx';
import { Badge, HealthBadge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { DataTable } from '../../../components/ui/DataTable.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { SectionCard, SectionTable } from '../../../components/ui/SectionCard.jsx';
import { StatTile } from '../../../components/ui/StatTile.jsx';
import { RadarChart } from '../../../components/charts/RadarChart.jsx';
import { HealthDimensions } from '../../../components/dashboard/HealthDimensions.jsx';

/** The mentor's landing view: portfolio counts, then who needs attention. */
export function MentorDashboard({ data, onOpenMentee }) {
  const { stats, attention, cohortHealth, initialInteractionAlerts } = data;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Assigned Mentees"
          value={stats.assignedMentees}
          footer={`${stats.batchCount} batches · ${stats.reviewCycle} reviews`}
        />
        <StatTile
          label="Meeting Compliance"
          value={stats.compliance}
          suffix="%"
          footer={`${stats.meetingsHeld} of ${stats.meetingsPlanned} meetings recorded`}
        />
        <StatTile
          label="Record Books Complete"
          value={stats.recordBooksComplete}
          suffix={`/ ${stats.recordBooksTotal}`}
          footer="First record-book review recorded"
        />
        <StatTile
          label="Open Action Items"
          value={stats.openActionItems}
          footer={`${stats.overdueMeetings} overdue meeting${stats.overdueMeetings === 1 ? '' : 's'}`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <WatchTile label="Attendance shortfalls" value={stats.attendanceShortfalls} tone="amber" />
        <WatchTile label="Standing arrears" value={stats.standingArrears} tone="indigo" />
        <WatchTile label="Well-being concerns" value={stats.wellbeingConcerns} tone="amber" />
        <WatchTile label="Parent contacts logged" value={stats.parentContactsThisTerm} tone="green" />
      </div>

      {initialInteractionAlerts.length > 0 && (
        <SectionTable
          title="Initial Mentor Interaction Due"
          subtitle="These mentees have not had an interaction within one month of the semester start."
          action={<Badge tone="rose" size="md">{initialInteractionAlerts.length} overdue</Badge>}
        >
          <DataTable
            rows={initialInteractionAlerts}
            rowKey={(m) => m.id}
            onRowClick={(m) => onOpenMentee(m.id)}
            columns={[
              {
                key: 'student',
                header: 'Student',
                render: (m, i) => (
                  <div className="flex items-center gap-3">
                    <Avatar initials={m.initials} seed={i} size="sm" />
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-[11.5px] text-muted">{m.rollNumber} · {m.batch}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'status', header: 'Status', align: 'right', render: () => <Badge tone="rose">Interaction not recorded</Badge> },
              {
                key: 'open',
                header: '',
                align: 'right',
                render: (m) => (
                  <Button size="sm" variant="secondary" onClick={(event) => { event.stopPropagation(); onOpenMentee(m.id); }}>
                    Open record
                  </Button>
                ),
              },
            ]}
          />
        </SectionTable>
      )}

      <SectionTable
        title="Students Needing Attention"
        subtitle="Ranked by health index · lowest first"
        action={<Badge tone={attention.length ? 'rose' : 'green'} size="md">{attention.length} flagged</Badge>}
      >
        <DataTable
          rows={attention}
          rowKey={(m) => m.id}
          onRowClick={(m) => onOpenMentee(m.id)}
          empty={
            <EmptyState
              title="Everyone's on track"
              description="No mentees are flagged this week."
              icon="✓"
            />
          }
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
            { key: 'health', header: 'Health', align: 'right', render: (m) => <HealthBadge value={m.health} tone={m.healthTone} /> },
            { key: 'cgpa', header: 'CGPA', align: 'right', render: (m) => <span className="tnum">{m.cgpa.toFixed(1)}</span> },
            {
              key: 'attendance',
              header: 'Attendance',
              align: 'right',
              render: (m) => (
                <span className={`tnum font-semibold ${m.attendanceBelowRequirement ? 'text-bad-ink' : 'text-muted-strong'}`}>
                  {m.attendance}%
                </span>
              ),
            },
            { key: 'flagReason', header: 'Reason', align: 'right', render: (m) => <Badge tone={m.flagTone}>{m.flagReason}</Badge> },
            { key: 'lastMeeting', header: 'Last Meeting', align: 'right', render: (m) => <span className="tnum text-muted">{m.lastMeeting}</span> },
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
                  Record book
                </Button>
              ),
            },
          ]}
        />
      </SectionTable>

      <SectionCard
        title="Cohort Health Index"
        subtitle="Mean of each dimension across your mentees"
        action={
          <span className="tnum font-display text-[26px] font-semibold text-ink">
            {cohortHealth.overall}
          </span>
        }
      >
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start">
          <RadarChart dimensions={cohortHealth.dimensions} />
          <div className="w-full flex-1">
            <HealthDimensions dimensions={cohortHealth.dimensions} showWeights />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function WatchTile({ label, value, tone }) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <div className="flex items-baseline gap-2">
        <span className="tnum font-display text-[26px] font-semibold leading-none text-ink">{value}</span>
        <Badge tone={tone}>{label}</Badge>
      </div>
    </div>
  );
}
