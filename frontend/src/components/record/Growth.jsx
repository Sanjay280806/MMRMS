import { Badge } from '../ui/Badge.jsx';
import { DataTable } from '../ui/DataTable.jsx';
import { DefinitionList } from '../ui/DefinitionList.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ProgressBar } from '../ui/ProgressBar.jsx';
import { SectionCard, SectionTable } from '../ui/SectionCard.jsx';
import { cx, tone as toneOf } from '../../lib/tone.js';

/** Section 6 — Participation Record, in the book's three groups. */
export function ParticipationRecord({ participation, action }) {
  const empty = (what) => (
    <EmptyState title={`No ${what} recorded`} description="Add entries as you take part." icon="◇" />
  );

  return (
    <div className="space-y-5">
      <SectionTable
        section="Section 6 · Technical"
        title="Technical Activities"
        subtitle="Hackathons, symposia, paper presentations and technical events"
        action={action}
      >
        <DataTable
          rows={participation.technical}
          rowKey={(r) => r.id}
          empty={empty('technical activities')}
          columns={[
            { key: 'activity', header: 'Activity', className: 'font-medium' },
            { key: 'date', header: 'Date', align: 'right', render: (r) => <span className="tnum">{r.date}</span> },
            { key: 'role', header: 'Role', render: (r) => <span className="text-muted-strong">{r.role}</span> },
            { key: 'achievement', header: 'Achievement', align: 'right', render: (r) => <Badge tone="indigo">{r.achievement}</Badge> },
          ]}
        />
      </SectionTable>

      <SectionTable
        section="Section 6 · Co-Curricular"
        title="Co-Curricular Activities"
        subtitle="Clubs, societies and organising roles"
      >
        <DataTable
          rows={participation.coCurricular}
          rowKey={(r) => r.id}
          empty={empty('co-curricular activities')}
          columns={[
            { key: 'activity', header: 'Activity', className: 'font-medium' },
            { key: 'date', header: 'Date', align: 'right', render: (r) => <span className="tnum">{r.date}</span> },
            { key: 'achievement', header: 'Achievement', align: 'right', render: (r) => <Badge tone="green">{r.achievement}</Badge> },
          ]}
        />
      </SectionTable>

      <SectionCard
        section="Section 6 · Extra-Curricular"
        title="Extra-Curricular Activities"
        subtitle={participation.categories.join(' · ')}
      >
        {participation.extraCurricular.length === 0 ? (
          empty('extra-curricular activities')
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {participation.extraCurricular.map((e) => (
              <li key={e.id} className="rounded-xl border border-line bg-canvas/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone="slate">{e.category}</Badge>
                  <span className="tnum text-[11.5px] text-muted-soft">{e.date}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-ink">{e.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

/** Section 7 — Certification Tracker. */
export function CertificationTracker({ certifications, action }) {
  return (
    <SectionTable
      section="Section 7"
      title="Certification Tracker"
      subtitle={`${certifications.completed} of ${certifications.rows.length} completed`}
      action={action}
    >
      <DataTable
        rows={certifications.rows}
        rowKey={(r) => r.id ?? r.certification}
        empty={<EmptyState title="No certifications yet" description="Track courses you plan, start and finish." />}
        columns={[
          { key: 'certification', header: 'Certification', className: 'font-medium' },
          { key: 'platform', header: 'Platform', render: (r) => <span className="text-muted-strong">{r.platform}</span> },
          {
            key: 'progress',
            header: 'Progress',
            render: (r) => (
              <div className="flex min-w-[110px] items-center gap-2">
                <ProgressBar className="flex-1" percent={r.progress} tone={r.tone} height="h-1.5" />
                <span className="tnum text-[11.5px] text-muted">{r.progress}%</span>
              </div>
            ),
          },
          { key: 'status', header: 'Status', align: 'right', render: (r) => <Badge tone={r.tone}>{r.status}</Badge> },
          {
            key: 'completionDate',
            header: 'Completed',
            align: 'right',
            render: (r) => <span className="tnum text-muted">{r.completionDate ?? '—'}</span>,
          },
        ]}
      />
    </SectionTable>
  );
}

/** Section 8 — Placement Readiness. `onUpdate` makes the rows editable. */
export function PlacementReadiness({ placementReadiness, onUpdate, saving }) {
  return (
    <SectionCard
      section="Section 8"
      title="Placement Readiness"
      subtitle={`${placementReadiness.completed} of ${placementReadiness.total} complete`}
      action={
        <div className="w-32">
          <ProgressBar
            percent={(placementReadiness.completed / placementReadiness.total) * 100}
            tone={placementReadiness.completed >= 5 ? 'green' : 'amber'}
            height="h-2"
          />
        </div>
      }
    >
      <ul className="divide-y divide-line">
        {placementReadiness.rows.map((row) => (
          <li key={row.item} className="flex flex-wrap items-center gap-3 py-3.5 first:pt-0 last:pb-0">
            <span
              aria-hidden="true"
              className={cx(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                row.status === 'Completed'
                  ? 'bg-good text-white'
                  : row.status === 'In Progress'
                    ? 'bg-warn/20 text-warn-ink'
                    : 'border-[1.5px] border-line-strong text-transparent',
              )}
            >
              {row.status === 'Completed' ? '✓' : row.status === 'In Progress' ? '·' : ''}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-ink">{row.item}</p>
              {row.note && <p className="mt-0.5 text-[11.5px] text-muted">{row.note}</p>}
            </div>

            {onUpdate ? (
              <select
                aria-label={`${row.item} status`}
                value={row.status}
                disabled={saving === row.item}
                onChange={(e) => onUpdate(row.item, e.target.value)}
                className="focus-ring rounded-lg border border-line-strong bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-ink disabled:opacity-60"
              >
                {['Not Started', 'In Progress', 'Completed'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            ) : (
              <Badge tone={row.tone}>{row.status}</Badge>
            )}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/** Section 9 — Internship / Project Tracking. */
export function InternshipAndProject({ record }) {
  return (
    <SectionCard
      section="Section 9"
      title="Internship / Project Tracking"
      action={
        <Badge tone={record.internshipStatus === 'Completed' ? 'green' : 'amber'} size="md">
          {record.internshipStatus}
        </Badge>
      }
    >
      <DefinitionList
        columns={2}
        items={[
          { key: 'Internship Company', value: record.internshipCompany },
          { key: 'Internship Role', value: record.internshipRole },
          { key: 'Internship Period', value: record.internshipPeriod },
          { key: 'Faculty Guide', value: record.facultyGuide },
          { key: 'Project Title', value: record.projectTitle, span: true },
          { key: 'Expected Completion', value: record.expectedCompletion },
        ]}
      />

      <div className="mt-5 rounded-xl border border-line bg-canvas/60 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[12.5px] font-semibold text-muted-strong">Project progress</span>
          <span className="tnum text-[12.5px] font-semibold text-ink">{record.progress}%</span>
        </div>
        <ProgressBar
          percent={record.progress}
          tone={record.progress >= 70 ? 'green' : record.progress >= 40 ? 'indigo' : 'amber'}
        />
        {record.progressNote && (
          <p className="mt-2.5 text-[12px] leading-relaxed text-muted">{record.progressNote}</p>
        )}
      </div>
    </SectionCard>
  );
}

/** Section 10 — Student Well-being. */
export function WellbeingReview({ wellbeing }) {
  return (
    <SectionCard
      section="Section 10"
      title="Student Well-being"
      subtitle="Reviewed at each mentoring meeting"
      action={
        <Badge tone={wellbeing.concerns ? 'amber' : 'green'} size="md">
          {wellbeing.concerns} concern{wellbeing.concerns === 1 ? '' : 's'}
        </Badge>
      }
    >
      <ul className="divide-y divide-line">
        {wellbeing.rows.map((row) => (
          <li key={row.aspect} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
            <span
              aria-hidden="true"
              className={cx(
                'mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full',
                toneOf(row.tone).solid,
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink">{row.aspect}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{row.remarks}</p>
            </div>
            {row.concern && <Badge tone="amber">Needs support</Badge>}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/** Section 11 — Parent Interaction Log. */
export function ParentInteractionLog({ parentInteractions, showStudent }) {
  const columns = [
    { key: 'date', header: 'Date', render: (r) => <span className="tnum font-medium">{r.date}</span> },
    { key: 'mode', header: 'Mode', render: (r) => <Badge tone="slate">{r.mode}</Badge> },
    { key: 'discussion', header: 'Discussion', className: 'text-muted-strong' },
    { key: 'action', header: 'Action', className: 'text-muted-strong' },
  ];

  if (showStudent) {
    columns.unshift({ key: 'student', header: 'Student', className: 'font-medium' });
  }

  return (
    <SectionTable
      section="Section 11"
      title="Parent Interaction Log"
      subtitle="Every contact with the parent or guardian"
    >
      <DataTable
        rows={parentInteractions.rows ?? parentInteractions}
        rowKey={(r) => r.id}
        empty={<EmptyState title="No parent contact logged" description="Calls and meetings with parents are recorded here." />}
        columns={columns}
      />
    </SectionTable>
  );
}
