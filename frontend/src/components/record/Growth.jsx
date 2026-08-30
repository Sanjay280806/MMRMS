import { useState } from 'react';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { DataTable } from '../ui/DataTable.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ProgressBar } from '../ui/ProgressBar.jsx';
import { SectionCard, SectionTable } from '../ui/SectionCard.jsx';
import { cx, tone as toneOf } from '../../lib/tone.js';
import { EvidenceModal } from './EvidenceModal.jsx';

function ViewEvidenceButton({ evidence = [], title, label = 'View' }) {
  const [open, setOpen] = useState(false);
  if (!evidence.length) return null;

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <EvidenceModal open={open} title={title} files={evidence} onClose={() => setOpen(false)} />
    </>
  );
}

function categoryTone(category) {
  if (category === 'Technical') return 'indigo';
  if (category === 'Co-Curricular') return 'green';
  return 'slate';
}

/** Section 6 — unified participation history with per-record evidence. */
export function ParticipationRecord({ participation }) {
  const records = participation.history ?? [];

  return (
    <SectionCard
      section="Section 6"
      title="Participation History"
      subtitle="Your technical, co-curricular, and extra-curricular activities"
    >
      {records.length === 0 ? (
        <EmptyState
          title="No participation records yet"
          description="Add your technical, co-curricular, or extra-curricular activities."
          icon="◇"
        />
      ) : (
        <ul className="divide-y divide-line">
          {records.map((record) => {
            const title = record.activity;
            return (
              <li key={record.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={categoryTone(record.category)}>{record.category}</Badge>
                      {record.activityType && <Badge tone="slate">{record.activityType}</Badge>}
                    </div>
                    <p className="mt-2 text-[14px] font-semibold text-ink">{title}</p>
                    <dl className="mt-2 grid gap-1 text-[12.5px] text-muted sm:grid-cols-2">
                      <div>
                        <span className="text-muted-soft">Date: </span>
                        <span className="tnum font-medium text-muted-strong">{record.date}</span>
                      </div>
                      {record.role && record.role !== '—' && (
                        <div>
                          <span className="text-muted-soft">Role: </span>
                          <span className="text-muted-strong">{record.role}</span>
                        </div>
                      )}
                      {record.achievement && record.achievement !== '—' && (
                        <div className="sm:col-span-2">
                          <span className="text-muted-soft">Achievement: </span>
                          <span className="text-muted-strong">{record.achievement}</span>
                        </div>
                      )}
                    </dl>
                  </div>
                  <ViewEvidenceButton evidence={record.evidence} title={title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

/** Section 7 — Certification history with per-record certificates. */
export function CertificationTracker({ certifications }) {
  const rows = certifications.rows ?? [];

  return (
    <SectionCard
      section="Section 7"
      title="Certification History"
      subtitle="Certifications you have added"
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No certifications added yet"
          description="Add certifications and upload your certificate when available."
        />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.id ?? row.certification} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">{row.certification}</p>
                  <dl className="mt-2 grid gap-1 text-[12.5px] text-muted sm:grid-cols-2">
                    <div>
                      <span className="text-muted-soft">Platform: </span>
                      <span className="text-muted-strong">{row.platform}</span>
                    </div>
                    {row.completionDate && (
                      <div>
                        <span className="text-muted-soft">Completed: </span>
                        <span className="tnum text-muted-strong">{row.completionDate}</span>
                      </div>
                    )}
                  </dl>
                </div>
                <ViewEvidenceButton evidence={row.evidence} title={row.certification} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
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

function internshipTypeLabel(type) {
  if (type === 'Internship + Project') return 'INTERNSHIP + PROJECT';
  return String(type ?? 'Record').toUpperCase();
}

/** Section 9 — Internship / Project records with per-record evidence. */
export function InternshipAndProject({ internshipAndProject }) {
  const records = internshipAndProject?.records ?? [];

  return (
    <SectionCard section="Section 9" title="Internship / Project History">
      {records.length === 0 ? (
        <EmptyState
          title="No internship or project records yet"
          description="Add your internship or project details and supporting evidence."
        />
      ) : (
        <ul className="divide-y divide-line">
          {records.map((record) => {
            const title =
              record.type === 'Project'
                ? record.projectTitle
                : record.type === 'Internship + Project'
                  ? `${record.internshipCompany} · ${record.projectTitle}`
                  : record.internshipCompany;

            return (
              <li key={record.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Badge tone="indigo">{internshipTypeLabel(record.type)}</Badge>
                    <p className="mt-2 text-[14px] font-semibold text-ink">{title}</p>
                    <dl className="mt-2 space-y-1 text-[12.5px] text-muted">
                      {record.internshipRole && (
                        <div>
                          <span className="text-muted-soft">Role: </span>
                          <span className="text-muted-strong">{record.internshipRole}</span>
                        </div>
                      )}
                      {record.internshipPeriod && (
                        <div>
                          <span className="text-muted-soft">Period: </span>
                          <span className="tnum text-muted-strong">{record.internshipPeriod}</span>
                        </div>
                      )}
                      {record.facultyGuide && (
                        <div>
                          <span className="text-muted-soft">Faculty Guide: </span>
                          <span className="text-muted-strong">{record.facultyGuide}</span>
                        </div>
                      )}
                      {record.expectedCompletion && (
                        <div>
                          <span className="text-muted-soft">Expected Completion: </span>
                          <span className="tnum text-muted-strong">{record.expectedCompletion}</span>
                        </div>
                      )}
                      {(record.description || record.projectDescription) && (
                        <div>
                          <span className="text-muted-soft">Details: </span>
                          <span className="text-muted-strong">{record.description || record.projectDescription}</span>
                        </div>
                      )}
                    </dl>
                  </div>
                  <ViewEvidenceButton evidence={record.evidence} title={title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
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
