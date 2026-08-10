import { Badge } from '../ui/Badge.jsx';
import { DataTable } from '../ui/DataTable.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ProgressBar } from '../ui/ProgressBar.jsx';
import { SectionCard, SectionTable } from '../ui/SectionCard.jsx';
import { BarSeries } from '../charts/BarSeries.jsx';
import { cx, tone as toneOf } from '../../lib/tone.js';

/** Section 2 — Academic Performance Tracker. */
export function PerformanceTracker({ performance }) {
  return (
    <SectionTable
      section="Section 2"
      title="Academic Performance Tracker"
      subtitle={`CGPA ${performance.cgpa} of ${performance.gpaScale} · target ${performance.cgpaTarget}`}
      action={
        <Badge tone={performance.standingArrears ? 'rose' : 'green'} size="md">
          {performance.standingArrears} standing arrear{performance.standingArrears === 1 ? '' : 's'}
        </Badge>
      }
    >
      <DataTable
        rows={performance.rows}
        rowKey={(r) => r.semester}
        empty={<EmptyState title="No results recorded" description="Semester results appear here once published." />}
        columns={[
          { key: 'semester', header: 'Semester', render: (r) => <span className="font-medium">Semester {r.semester}</span> },
          { key: 'gpa', header: 'GPA', align: 'right', render: (r) => <span className="tnum">{r.gpa.toFixed(2)}</span> },
          { key: 'cgpa', header: 'CGPA', align: 'right', render: (r) => <span className="tnum font-semibold">{r.cgpa.toFixed(2)}</span> },
          { key: 'standingArrears', header: 'Standing', align: 'right', render: (r) => <ArrearCell value={r.standingArrears} /> },
          { key: 'newArrears', header: 'New', align: 'right', render: (r) => <ArrearCell value={r.newArrears} /> },
          { key: 'clearedArrears', header: 'Cleared', align: 'right', render: (r) => (
            <span className={cx('tnum', r.clearedArrears ? 'font-semibold text-good-ink' : 'text-muted-soft')}>
              {r.clearedArrears}
            </span>
          ) },
        ]}
      />

      <div className="border-t border-line p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.07em] text-muted-soft">
          GPA by semester
        </p>
        <BarSeries data={performance.rows.map((r) => ({ semester: r.semester, value: r.gpa }))} />
      </div>
    </SectionTable>
  );
}

function ArrearCell({ value }) {
  return (
    <span className={cx('tnum', value ? 'font-semibold text-bad-ink' : 'text-muted-soft')}>
      {value}
    </span>
  );
}

/** CGPA against the target agreed with the mentor. */
export function CgpaTarget({ performance, className }) {
  const gap = performance.cgpaGap;

  return (
    <SectionCard title="CGPA vs Target" subtitle={`Target agreed with your mentor: ${performance.cgpaTarget}`} className={className}>
      <div className="flex items-baseline gap-2">
        <span className="tnum font-display text-[34px] font-semibold leading-none text-ink">
          {performance.cgpa.toFixed(1)}
        </span>
        <span className="tnum text-[13px] text-muted">/ {performance.cgpaTarget.toFixed(1)}</span>
      </div>

      <ProgressBar
        className="mt-4"
        percent={(performance.cgpa / performance.cgpaTarget) * 100}
        tone={gap <= 0 ? 'green' : gap <= 0.5 ? 'indigo' : 'amber'}
      />

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
        {gap <= 0
          ? 'Target met — hold this through the semester.'
          : `${gap.toFixed(1)} away — one strong semester closes the gap.`}
      </p>
    </SectionCard>
  );
}

/** Section 3 — Attendance Monitoring. */
export function AttendanceMonitoring({ attendance }) {
  const t = toneOf(attendance.tone);

  return (
    <SectionTable
      section="Section 3"
      title="Attendance Monitoring"
      subtitle={`Institutional requirement: ${attendance.requirement}%`}
      action={
        <span className={cx('tnum font-display text-[26px] font-semibold', t.text)}>
          {attendance.current}%
        </span>
      }
    >
      {attendance.shortageSubjects.length > 0 && (
        <div className="border-b border-line bg-warn/[0.08] px-5 py-3.5">
          <p className="text-[12.5px] leading-relaxed text-warn-ink">
            <strong className="font-semibold">Shortage: </strong>
            {attendance.shortageSubjects
              .map((s) => `${s.subject} at ${s.attendance}% (attend the next ${s.classesToRecover} classes to recover)`)
              .join('; ')}
            .
          </p>
        </div>
      )}

      <DataTable
        rows={attendance.reviews}
        rowKey={(r) => r.date}
        empty={<EmptyState title="No reviews recorded" description="Attendance reviews are logged at each mentoring meeting." />}
        columns={[
          { key: 'date', header: 'Review Date', render: (r) => <span className="tnum font-medium">{r.date}</span> },
          {
            key: 'percentage',
            header: 'Attendance %',
            align: 'right',
            render: (r) => (
              <span className={cx('tnum font-semibold', toneOf(r.tone).text)}>{r.percentage}%</span>
            ),
          },
          {
            key: 'shortage',
            header: 'Shortage',
            render: (r) =>
              r.belowRequirement ? (
                <Badge tone="rose">{r.shortage}</Badge>
              ) : (
                <span className="text-muted-soft">None</span>
              ),
          },
          { key: 'actionTaken', header: 'Action Taken', className: 'text-muted-strong' },
        ]}
      />
    </SectionTable>
  );
}

/** Section 4 — Course Performance. */
export function CoursePerformance({ coursePerformance }) {
  return (
    <SectionTable
      section="Section 4"
      title="Course Performance"
      subtitle={`CIA 1, CIA 2 and Model marks out of ${coursePerformance.markScale}, with attendance per subject`}
    >
      <DataTable
        rows={coursePerformance.rows}
        rowKey={(r) => r.code ?? r.subject}
        empty={<EmptyState title="No marks recorded" description="Internal marks appear here once published." />}
        columns={[
          {
            key: 'subject',
            header: 'Subject',
            render: (r) => (
              <div className="min-w-0">
                <p className="truncate font-medium">{r.subject}</p>
                {r.code && <p className="tnum mt-0.5 text-[11px] text-muted-soft">{r.code}</p>}
              </div>
            ),
          },
          { key: 'cia1', header: 'CIA 1', align: 'right', render: (r) => <Mark value={r.cia1} /> },
          { key: 'cia2', header: 'CIA 2', align: 'right', render: (r) => <Mark value={r.cia2} /> },
          { key: 'model', header: 'Model', align: 'right', render: (r) => <Mark value={r.model} /> },
          {
            key: 'average',
            header: 'Avg',
            align: 'right',
            render: (r) => <span className="tnum font-semibold">{r.average}</span>,
          },
          {
            key: 'attendance',
            header: 'Attendance',
            align: 'right',
            render: (r) =>
              r.attendance == null ? (
                <span className="text-muted-soft">—</span>
              ) : (
                <span className={cx('tnum font-semibold', toneOf(r.attendanceTone).text)}>
                  {r.attendance}%
                </span>
              ),
          },
          {
            key: 'status',
            header: 'Status',
            align: 'right',
            render: (r) => <Badge tone={r.statusTone}>{r.status}</Badge>,
          },
        ]}
      />
    </SectionTable>
  );
}

function Mark({ value }) {
  return <span className="tnum text-muted-strong">{value ?? '—'}</span>;
}

/** Section 5 — Arrear Tracking. */
export function ArrearTracking({ arrears }) {
  return (
    <SectionTable
      section="Section 5"
      title="Arrear Tracking"
      subtitle="Every arrear, its action plan and target completion"
    >
      <DataTable
        rows={arrears.rows}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            title="No arrears"
            description="Nothing outstanding — a clean record across every semester."
            icon="✓"
          />
        }
        columns={[
          {
            key: 'subject',
            header: 'Subject',
            render: (r) => (
              <div className="min-w-0">
                <p className="truncate font-medium">{r.subject}</p>
                {r.code && <p className="tnum mt-0.5 text-[11px] text-muted-soft">{r.code}</p>}
              </div>
            ),
          },
          { key: 'semester', header: 'Semester', align: 'right', render: (r) => <span className="tnum">Sem {r.semester}</span> },
          { key: 'status', header: 'Status', align: 'right', render: (r) => <Badge tone={r.tone}>{r.status}</Badge> },
          { key: 'actionPlan', header: 'Action Plan', className: 'text-muted-strong' },
          { key: 'targetCompletion', header: 'Target', align: 'right', render: (r) => <span className="tnum">{r.targetCompletion}</span> },
        ]}
      />
    </SectionTable>
  );
}
