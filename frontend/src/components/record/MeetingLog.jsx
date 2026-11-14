import { useState, useMemo } from 'react';
import { api } from '../../api/client.js';
import { Badge } from '../ui/Badge.jsx';
import { Card } from '../ui/Card.jsx';
import { DefinitionList } from '../ui/DefinitionList.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ProgressBar } from '../ui/ProgressBar.jsx';
import { SectionCard } from '../ui/SectionCard.jsx';
import { Button } from '../ui/Button.jsx';
import { cx, tone as toneOf } from '../../lib/tone.js';
import {
  parseAnyDateToNumber,
  downloadMeetingReport,
  downloadConsolidatedReport,
} from '../../lib/meetingReports.js';

function parseMeetingDate(dateStr) {
  return parseAnyDateToNumber(dateStr);
}

function parseInputDate(isoStr) {
  return parseAnyDateToNumber(isoStr);
}

/**
 * Section 12 — the Mentor Meeting Log. Each meeting renders as the printed
 * minutes: header, agenda, discussion, action items, progress, goal progress,
 * remarks, next review and the signature line.
 */
export function MeetingLog({
  meetings,
  menteeName,
  onUpdateAction,
  savingAction,
  canDownload = true,
  isStudent = false,
  onMeetingSigned,
}) {
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

  const [isFilteredState, setIsFilteredState] = useState(false);
  const [downloadingConsolidated, setDownloadingConsolidated] = useState(false);
  const [consolidatedError, setConsolidatedError] = useState(null);

  async function handleDownloadConsolidated() {
    if (!filteredRows.length) return;
    setDownloadingConsolidated(true);
    setConsolidatedError(null);
    try {
      const rangeText = (appliedStart || appliedEnd)
        ? `From ${appliedStart || 'earliest'} to ${appliedEnd || 'latest'}`
        : 'All Recorded Meetings';
      await downloadConsolidatedReport(filteredRows, menteeName, rangeText);
    } catch (err) {
      console.error('[MeetingLog] consolidated download failed:', err);
      setConsolidatedError('Failed to generate consolidated report. Please try again.');
    } finally {
      setDownloadingConsolidated(false);
    }
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

            <div className="flex flex-wrap items-center gap-2">
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
              {canDownload && filteredRows.length > 0 && (
                <Button
                  id="download-consolidated-report"
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadConsolidated}
                  disabled={downloadingConsolidated}
                >
                  {downloadingConsolidated
                    ? 'Generating PDF…'
                    : isFiltered
                      ? `↓ Download Consolidated Report (${filteredRows.length})`
                      : `↓ Download Consolidated Report`}
                </Button>
              )}
            </div>
          </div>

          {filterError && (
            <p role="alert" className="mt-2 text-[11.5px] font-semibold text-bad-ink">
              {filterError}
            </p>
          )}

          {consolidatedError && (
            <p role="alert" className="mt-2 text-[11.5px] font-semibold text-bad-ink">
              {consolidatedError}
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
                  canDownload={canDownload}
                  isStudent={isStudent}
                  onMeetingSigned={onMeetingSigned}
                />
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}

function MeetingEntry({
  meeting,
  menteeName,
  open,
  onToggle,
  onUpdateAction,
  savingAction,
  canDownload = true,
  isStudent = false,
  onMeetingSigned,
}) {
  const [downloadError, setDownloadError] = useState(null);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState(null);
  const [studentSignedState, setStudentSignedState] = useState(Boolean(meeting.studentSigned));

  async function handleSignMinutes(e) {
    e.stopPropagation();
    setSigning(true);
    setSignError(null);
    try {
      await api(`/student/me/meetings/${meeting.id}/sign`, { method: 'POST' });
      setStudentSignedState(true);
      meeting.studentSigned = true;
      meeting.signed = Boolean(meeting.mentorSigned);
      onMeetingSigned?.(meeting.id);
    } catch (err) {
      setSignError(err.message || 'Failed to sign meeting minutes.');
    } finally {
      setSigning(false);
    }
  }

  async function handleDownload(e) {
    e.stopPropagation(); // prevent the card toggle from firing
    setDownloadError(null);
    try {
      await downloadMeetingReport(meeting, menteeName);
    } catch (err) {
      setDownloadError('Download failed. Please try again.');
      // eslint-disable-next-line no-console
      console.error('[MeetingLog] download failed:', err);
    }
  }

  const isFullySigned = Boolean(meeting.signed || (meeting.mentorSigned && studentSignedState));

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
            {(meeting.startTime || meeting.endTime) && (
              <span className="text-[12px] font-medium text-slate-700">
                {meeting.startTime}{meeting.endTime ? ` – ${meeting.endTime}` : ''}
              </span>
            )}
            <Badge tone={meeting.modeTone}>{meeting.mode}</Badge>
            {meeting.category && <Badge tone="indigo">{meeting.category}</Badge>}
            <span className="text-[11.5px] text-muted">{meeting.duration}</span>
            {meeting.mode === 'Offline' && meeting.location && (
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                📍 {meeting.location}
              </span>
            )}
            {(meeting.mode === 'Online' || meeting.teamsJoinUrl) && (
              <a
                href={meeting.teamsJoinUrl || 'https://teams.microsoft.com'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#464EB8] hover:bg-[#3b429f] text-white font-semibold text-[11px] shadow-xs transition"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.5 7.5h-5v5h5v-5zm0-4.5h-5a2.5 2.5 0 0 0-2.5 2.5v12a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V5.5A2.5 2.5 0 0 0 19.5 3zM9.5 5.5h-5a2.5 2.5 0 0 0-2.5 2.5v8a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 9.5 5.5z" />
                </svg>
                Join Teams
              </a>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-muted">{meeting.agenda.join(' · ')}</p>
        </div>

        <div className="flex items-center gap-2">
          {meeting.actionSummary.total > 0 && (
            <Badge tone={meeting.actionSummary.closed === meeting.actionSummary.total ? 'green' : 'amber'}>
              {meeting.actionSummary.closed}/{meeting.actionSummary.total} actions
            </Badge>
          )}
          {isFullySigned ? (
            <Badge tone="green">Signed</Badge>
          ) : studentSignedState ? (
            <Badge tone="green">Student Signed</Badge>
          ) : meeting.mentorSigned ? (
            <Badge tone="amber">Pending Student Signature</Badge>
          ) : null}
          {canDownload && (
            <button
              type="button"
              id={`download-meeting-${meeting.id}`}
              aria-label={`Download meeting report for meeting ${meeting.number}`}
              onClick={handleDownload}
              className="focus-ring rounded-md border border-line px-2 py-1 text-[10.5px] font-semibold text-muted transition hover:border-muted-soft hover:text-ink"
            >
              ↓ Download
            </button>
          )}
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
          {(meeting.mode === 'Online' || meeting.teamsJoinUrl) && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#464EB8]/30 bg-[#464EB8]/5 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#464EB8] text-white">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.5 7.5h-5v5h5v-5zm0-4.5h-5a2.5 2.5 0 0 0-2.5 2.5v12a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V5.5A2.5 2.5 0 0 0 19.5 3zM9.5 5.5h-5a2.5 2.5 0 0 0-2.5 2.5v8a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 9.5 5.5z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[12.5px] font-semibold text-ink">Microsoft Teams Online Mentoring Session</div>
                  <p className="text-[11.5px] text-muted">
                    {meeting.teamsJoinUrl ? 'Direct meeting room link generated via Microsoft Graph' : 'Connect via Microsoft Teams online workspace'}
                  </p>
                </div>
              </div>
              <a
                href={meeting.teamsJoinUrl || 'https://teams.microsoft.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#464EB8] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#3b429f] transition"
              >
                Join Teams Meeting ↗
              </a>
            </div>
          )}

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

          <MeetingEvidence photoProofs={meeting.photoProofs} geotag={meeting.geotag} location={meeting.location} mode={meeting.mode} />

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



          <div className="grid gap-4 sm:grid-cols-2">
            <Remark label="Mentor Remarks" text={meeting.mentorRemarks} tone="indigo" />
            <Remark label="Student Remarks" text={meeting.studentRemarks} tone="slate" />
          </div>

          {isStudent && !studentSignedState && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-[13px] font-bold text-indigo-950 flex items-center gap-1.5">
                    ✍ Review & Acknowledge Meeting Minutes
                  </h4>
                  <p className="text-[11.5px] text-indigo-800">
                    Please review the discussion points and action items above, then provide your digital signature to confirm acknowledgement.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  loading={signing}
                  onClick={handleSignMinutes}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                >
                  Sign & Acknowledge Minutes
                </Button>
              </div>
              {signError && (
                <p className="mt-2 text-xs font-semibold text-rose-600">{signError}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[12px] text-muted">
              Next review date:{' '}
              <strong className="tnum font-semibold text-ink">{meeting.nextReviewDate}</strong>
            </p>
            <div className="flex gap-2">
              <SignatureChip label="Mentor" signed={meeting.mentorSigned} />
              <SignatureChip label="Student" signed={studentSignedState} />
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

function MeetingEvidence({ photoProofs = [], geotag, location, mode }) {
  if (!photoProofs.length && !geotag && !location) return null;

  const locationUrl = geotag
    ? `https://www.google.com/maps?q=${geotag.latitude},${geotag.longitude}`
    : null;

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">Meeting Evidence & Venue</p>
      {location && (
        <p className="mt-1.5 text-[12.5px] text-ink font-medium">
          📍 <span className="text-muted text-[11.5px] font-normal">{mode === 'Offline' ? 'Venue / Location:' : 'Platform:'}</span> {location}
        </p>
      )}
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
