import { useState, useMemo } from 'react';
import { Badge } from '../ui/Badge.jsx';
import { Card } from '../ui/Card.jsx';
import { DefinitionList } from '../ui/DefinitionList.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ProgressBar } from '../ui/ProgressBar.jsx';
import { SectionCard } from '../ui/SectionCard.jsx';
import { Button } from '../ui/Button.jsx';
import { cx, tone as toneOf } from '../../lib/tone.js';

/** Month abbreviation → 1-based number. Matches the "DD Mon YYYY" format used by all existing meeting records. */
const MONTH_NUM = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

/**
 * Parses a display-format meeting date ("22 Jul 2026") into a YYYYMMDD integer
 * for reliable inclusive-range comparison. Returns null if the format is not recognised.
 */
function parseMeetingDate(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const [d, mon, y] = parts;
  const m = MONTH_NUM[mon];
  if (!m) return null;
  const day = parseInt(d, 10);
  const year = parseInt(y, 10);
  if (!Number.isFinite(day) || !Number.isFinite(year)) return null;
  return year * 10000 + m * 100 + day;
}

/**
 * Converts a native date-input value ("YYYY-MM-DD") to a YYYYMMDD integer
 * so it can be compared directly with parseMeetingDate results.
 */
function parseInputDate(isoStr) {
  if (!isoStr) return null;
  const [y, m, d] = isoStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  return y * 10000 + m * 100 + d;
}

/**
 * Generates and triggers a CSV download for a single meeting record.
 * Uses the native Blob + URL API — no external dependencies required.
 *
 * @param {object} meeting - the decorated meeting object from the API
 * @param {string} menteeName - the mentee's full name for the report header
 */
function downloadMeetingReport(meeting, menteeName) {
  // Safe date slug for the filename: spaces → underscores, strip commas/slashes.
  const dateSlug = String(meeting.date ?? '').replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '');
  const filename = `MMRMS_Meeting_Report_${meeting.number}_${dateSlug}.csv`;

  // Escape a cell value for RFC 4180 CSV.
  const cell = (v) => {
    const s = String(v ?? '—');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const row = (...cols) => cols.map(cell).join(',');

  const lines = [
    row('MMRMS Meeting Report'),
    row('Mentee', menteeName ?? '—'),
    row('Meeting Number', meeting.number),
    row('Meeting Date', meeting.date),
    row('Mode', meeting.mode),
    row('Category', meeting.category ?? '—'),
    row('Duration', meeting.duration),
    row('Agenda', (meeting.agenda ?? []).join('; ')),
    row(''),
    row('MINUTES'),
    row('Topics Discussed', meeting.topicsDiscussed),
    row('Student Concerns', meeting.studentConcerns),
    row('Mentor Suggestions', meeting.mentorSuggestions),
    row('Support Required', meeting.supportRequired),
    row(''),
    row('PROGRESS SINCE LAST MEETING'),
    row('Achievements', meeting.progressSinceLastMeeting?.achievements),
    row('Pending Tasks', meeting.progressSinceLastMeeting?.pendingTasks),
    row('Improvement Observed', meeting.progressSinceLastMeeting?.improvementObserved),
  ];

  // Action items table.
  if ((meeting.actionItems ?? []).length > 0) {
    lines.push(row(''));
    lines.push(row('ACTION ITEMS'));
    lines.push(row('Task', 'Responsible', 'Target Date', 'Status'));
    for (const item of meeting.actionItems) {
      lines.push(row(item.task, item.responsible, item.targetDate, item.status));
    }
  }

  // Goal progress table.
  if ((meeting.goalProgress ?? []).length > 0) {
    lines.push(row(''));
    lines.push(row('SMART GOAL PROGRESS'));
    lines.push(row('Goal', 'Current Status', 'Progress %'));
    for (const gp of meeting.goalProgress) {
      lines.push(row(gp.goal ?? gp.goalId, gp.currentStatus, gp.progress));
    }
  }

  // Remarks and review.
  lines.push(row(''));
  lines.push(row('REMARKS AND REVIEW'));
  lines.push(row('Mentor Remarks', meeting.mentorRemarks));
  lines.push(row('Student Remarks', meeting.studentRemarks));
  lines.push(row('Next Review Date', meeting.nextReviewDate));
  lines.push(row('Mentor Signature', meeting.mentorSigned ? 'Signed' : 'Pending'));
  lines.push(row('Student Signature', meeting.studentSigned ? 'Signed' : 'Pending'));

  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Section 12 — the Mentor Meeting Log. Each meeting renders as the printed
 * minutes: header, agenda, discussion, action items, progress, goal progress,
 * remarks, next review and the signature line.
 */
export function MeetingLog({ meetings, menteeName, onUpdateAction, savingAction }) {
  const [openId, setOpenId] = useState(meetings.rows[0]?.id ?? null);

  // ── Date-range filter state ───────────────────────────────────────────────
  // startDate / endDate: controlled input values (YYYY-MM-DD strings)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  // appliedStart / appliedEnd: the values actually used for filtering (set on Apply)
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd,   setAppliedEnd]   = useState('');
  // validation error shown when start > end
  const [filterError, setFilterError] = useState('');

  /** Meetings visible after applying the current filter. Never mutates meetings.rows. */
  const filteredRows = useMemo(() => {
    if (!appliedStart && !appliedEnd) return meetings.rows;
    const s = parseInputDate(appliedStart);
    const e = parseInputDate(appliedEnd);
    return meetings.rows.filter((m) => {
      const d = parseMeetingDate(m.date);
      if (d === null) return true; // unrecognised format: show rather than hide
      if (s !== null && d < s) return false;
      if (e !== null && d > e) return false;
      return true;
    });
  }, [meetings.rows, appliedStart, appliedEnd]);

  function handleApply() {
    const s = parseInputDate(startDate);
    const e = parseInputDate(endDate);
    if (s !== null && e !== null && s > e) {
      setFilterError('Start date must be on or before end date.');
      return;
    }
    setFilterError('');
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  }

  function handleClear() {
    setStartDate('');
    setEndDate('');
    setAppliedStart('');
    setAppliedEnd('');
    setFilterError('');
  }

  const isFiltered = Boolean(appliedStart || appliedEnd);
  // ─────────────────────────────────────────────────────────────────────────

  if (!meetings.rows.length) {
    return (
      <SectionCard section="Section 12" title="Mentor Meeting Log">
        <EmptyState
          title="No meetings recorded"
          description="Minutes of each mentoring meeting are recorded here."
          icon="◷"
        />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-5">
      <SectionCard
        section="Section 12"
        title="Mentor Meeting Log"
        subtitle={`${meetings.total} meeting${meetings.total === 1 ? '' : 's'} recorded${
          meetings.nextReviewDate ? ` · next review ${meetings.nextReviewDate}` : ''
        }`}
        action={
          meetings.openActionItems.length > 0 && (
            <Badge tone="amber" size="md">
              {meetings.openActionItems.length} open action item
              {meetings.openActionItems.length === 1 ? '' : 's'}
            </Badge>
          )
        }
      >
        {/* ── Date-range filter bar ──────────────────────────────────────── */}
        <div className="mb-4 rounded-xl border border-line bg-canvas/60 px-4 py-3">
          <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
            Filter by Date Range
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="meeting-filter-from"
                className="text-[10.5px] font-semibold text-muted"
              >
                From
              </label>
              <input
                id="meeting-filter-from"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="focus-ring rounded-lg border border-line-strong bg-white px-2.5 py-1.5 text-[12.5px] text-ink"
                aria-label="Filter meetings from date"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="meeting-filter-to"
                className="text-[10.5px] font-semibold text-muted"
              >
                To
              </label>
              <input
                id="meeting-filter-to"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="focus-ring rounded-lg border border-line-strong bg-white px-2.5 py-1.5 text-[12.5px] text-ink"
                aria-label="Filter meetings to date"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                id="meeting-filter-apply"
                variant="secondary"
                size="sm"
                onClick={handleApply}
              >
                Apply
              </Button>
              {isFiltered && (
                <Button
                  id="meeting-filter-clear"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {filterError && (
            <p role="alert" className="mt-2 text-[11.5px] font-semibold text-bad-ink">
              {filterError}
            </p>
          )}

          {isFiltered && !filterError && (
            <p className="mt-2 text-[11px] text-muted">
              Showing {filteredRows.length} of {meetings.total} meeting{meetings.total === 1 ? '' : 's'}
            </p>
          )}
        </div>
        {/* ─────────────────────────────────────────────────────────────────── */}

        {filteredRows.length === 0 ? (
          <EmptyState
            title="No meetings in this range"
            description="Try a different date range or clear the filter to see all meetings."
            icon="◷"
          />
        ) : (
          <ol className="space-y-2.5">
            {filteredRows.map((meeting) => (
              <li key={meeting.id}>
                <MeetingEntry
                  meeting={meeting}
                  menteeName={menteeName}
                  open={openId === meeting.id}
                  onToggle={() => setOpenId(openId === meeting.id ? null : meeting.id)}
                  onUpdateAction={onUpdateAction}
                  savingAction={savingAction}
                />
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}

function MeetingEntry({ meeting, menteeName, open, onToggle, onUpdateAction, savingAction }) {
  const [downloadError, setDownloadError] = useState(null);

  function handleDownload(e) {
    e.stopPropagation(); // prevent the card toggle from firing
    setDownloadError(null);
    try {
      downloadMeetingReport(meeting, menteeName);
    } catch (err) {
      setDownloadError('Download failed. Please try again.');
      // eslint-disable-next-line no-console
      console.error('[MeetingLog] download failed:', err);
    }
  }

  return (
    <Card as="article" className={cx('overflow-hidden', open && 'ring-1 ring-brand-200')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-3 px-4 py-3.5 text-left transition hover:bg-canvas/60"
      >
        <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-ink text-white">
          <span className="text-[8.5px] uppercase tracking-[.08em] opacity-60">Mtg</span>
          <span className="tnum text-[13px] font-bold leading-none">{meeting.number}</span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tnum text-[13px] font-semibold text-ink">{meeting.date}</span>
            <Badge tone={meeting.modeTone}>{meeting.mode}</Badge>
            {meeting.category && <Badge tone="indigo">{meeting.category}</Badge>}
            <span className="text-[11.5px] text-muted">{meeting.duration}</span>
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-muted">{meeting.agenda.join(' · ')}</p>
        </div>

        <div className="flex items-center gap-2">
          {meeting.actionSummary.total > 0 && (
            <Badge tone={meeting.actionSummary.closed === meeting.actionSummary.total ? 'green' : 'amber'}>
              {meeting.actionSummary.closed}/{meeting.actionSummary.total} actions
            </Badge>
          )}
          {meeting.signed && <Badge tone="green">Signed</Badge>}
          <button
            type="button"
            id={`download-meeting-${meeting.id}`}
            aria-label={`Download meeting report for meeting ${meeting.number}`}
            onClick={handleDownload}
            className="focus-ring rounded-md border border-line px-2 py-1 text-[10.5px] font-semibold text-muted transition hover:border-muted-soft hover:text-ink"
          >
            ↓ Download
          </button>
          <span aria-hidden="true" className={cx('text-[10px] text-muted-soft transition', open && 'rotate-180')}>
            ▼
          </span>
        </div>
      </button>

      {downloadError && (
        <p role="alert" className="px-4 pb-2 text-[11.5px] text-bad-ink">
          {downloadError}
        </p>
      )}

      {open && (
        <div className="space-y-5 border-t border-line bg-canvas/40 px-5 py-5">
          <AgendaChecklist agenda={meeting.agenda} />

          <DefinitionList
            columns={1}
            items={[
              { key: 'Topics Discussed', value: meeting.topicsDiscussed },
              { key: 'Student Concerns', value: meeting.studentConcerns },
              { key: 'Mentor Suggestions', value: meeting.mentorSuggestions },
              { key: 'Support Required', value: meeting.supportRequired },
            ]}
          />

          <MeetingEvidence photoProofs={meeting.photoProofs} geotag={meeting.geotag} />

          <ActionItems
            items={meeting.actionItems}
            onUpdate={onUpdateAction}
            saving={savingAction}
          />

          <div>
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
              Progress Since Last Meeting
            </p>
            <DefinitionList
              columns={3}
              items={[
                { key: 'Achievements', value: meeting.progressSinceLastMeeting.achievements },
                { key: 'Pending Tasks', value: meeting.progressSinceLastMeeting.pendingTasks },
                { key: 'Improvement Observed', value: meeting.progressSinceLastMeeting.improvementObserved },
              ]}
            />
          </div>

          {meeting.goalProgress.length > 0 && (
            <div>
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
                SMART Goal Progress
              </p>
              <ul className="space-y-3">
                {meeting.goalProgress.map((gp) => (
                  <li key={gp.goalId} className="rounded-xl border border-line bg-white p-3.5">
                    <p className="text-[12.5px] font-semibold text-ink">{gp.goal}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted">{gp.currentStatus}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <ProgressBar className="flex-1" percent={gp.progress} tone="indigo" height="h-1.5" />
                      <span className="tnum text-[11.5px] font-semibold text-muted-strong">
                        {gp.progress}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Remark label="Mentor Remarks" text={meeting.mentorRemarks} tone="indigo" />
            <Remark label="Student Remarks" text={meeting.studentRemarks} tone="slate" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[12px] text-muted">
              Next review date:{' '}
              <strong className="tnum font-semibold text-ink">{meeting.nextReviewDate}</strong>
            </p>
            <div className="flex gap-2">
              <SignatureChip label="Mentor" signed={meeting.mentorSigned} />
              <SignatureChip label="Student" signed={meeting.studentSigned} />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function AgendaChecklist({ agenda }) {
  const ALL = [
    'Academic Review',
    'Attendance Review',
    'Placement Preparation',
    'Personal Discussion',
    'Goal Progress',
    'Other',
  ];

  return (
    <div>
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
        Agenda
      </p>
      <ul className="flex flex-wrap gap-2">
        {ALL.map((item) => {
          const covered = agenda.includes(item);
          return (
            <li
              key={item}
              className={cx(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px]',
                covered
                  ? 'border-brand-500/25 bg-brand-500/10 font-semibold text-brand-500'
                  : 'border-line text-muted-faint',
              )}
            >
              <span aria-hidden="true">{covered ? '✓' : '○'}</span>
              {item}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MeetingEvidence({ photoProofs = [], geotag }) {
  if (!photoProofs.length && !geotag) return null;

  const locationUrl = geotag
    ? `https://www.google.com/maps?q=${geotag.latitude},${geotag.longitude}`
    : null;

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">Meeting Evidence</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {photoProofs.map((photo, index) => (
          <a
            key={`${photo.name}-${index}`}
            href={photo.dataUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-ring rounded-lg border border-line-strong bg-canvas px-3 py-1.5 text-[11.5px] font-semibold text-ink hover:border-muted-soft"
          >
            View photo: {photo.name}
          </a>
        ))}
        {locationUrl && (
          <a
            href={locationUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-ring rounded-lg border border-line-strong bg-canvas px-3 py-1.5 text-[11.5px] font-semibold text-ink hover:border-muted-soft"
          >
            View captured location
          </a>
        )}
      </div>
    </div>
  );
}

function ActionItems({ items, onUpdate, saving }) {
  if (!items.length) {
    return (
      <p className="text-[12.5px] text-muted-soft">No action items were recorded for this meeting.</p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
        Action Items
      </p>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              {['Task', 'Responsible', 'Target Date', 'Status'].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[.06em] text-muted-soft"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-line/70 last:border-0">
                <td className="px-3.5 py-2.5 text-[12.5px] text-ink">{item.task}</td>
                <td className="px-3.5 py-2.5 text-[12.5px] text-muted-strong">{item.responsible}</td>
                <td className="tnum px-3.5 py-2.5 text-[12.5px] text-muted-strong">{item.targetDate}</td>
                <td className="px-3.5 py-2.5 text-right">
                  {onUpdate && item.responsible === 'Student' ? (
                    <select
                      aria-label={`${item.task} status`}
                      value={item.status}
                      disabled={saving === item.id}
                      onChange={(e) => onUpdate(item.id, e.target.value)}
                      className="focus-ring rounded-lg border border-line-strong bg-white px-2 py-1 text-[11.5px] font-semibold text-ink disabled:opacity-60"
                    >
                      {['Pending', 'In Progress', 'Completed'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <Badge tone={item.tone}>{item.status}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Remark({ label, text, tone }) {
  const t = toneOf(tone);
  return (
    <div className={cx('rounded-xl px-4 py-3.5', t.bg)}>
      <p className={cx('text-[10.5px] font-semibold uppercase tracking-[.07em]', t.text)}>{label}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{text}</p>
    </div>
  );
}

function SignatureChip({ label, signed }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        signed ? 'bg-good/[0.14] text-good-ink' : 'border border-dashed border-line-strong text-muted-soft',
      )}
    >
      <span aria-hidden="true">{signed ? '✓' : '○'}</span>
      {label} signature
    </span>
  );
}
