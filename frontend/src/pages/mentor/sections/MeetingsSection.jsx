import { useState, useMemo } from 'react';
import { useResource } from '../../../hooks/useResource.js';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { DefinitionList } from '../../../components/ui/DefinitionList.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { SectionCard } from '../../../components/ui/SectionCard.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { cx } from '../../../lib/tone.js';
import {
  parseAnyDateToNumber,
  downloadMeetingReport,
  downloadConsolidatedReport,
  exportMeetingsToExcel,
} from '../../../lib/meetingReports.js';

export function MeetingsSection({ onOpenMentee, onRecordMeeting }) {
  const { data, loading, error, reload } = useResource('/mentor/me/meetings');

  const allMeetings = useMemo(() => data?.meetings ?? [], [data?.meetings]);

  // ── Filters state ────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');
  const [filterError, setFilterError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL'); // 'ALL' | 'Offline' | 'Online'
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Expanded card state
  const [openMeetingId, setOpenMeetingId] = useState(null);

  // Download loading states
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  function handleApplyFilter() {
    const s = parseAnyDateToNumber(startDate);
    const e = parseAnyDateToNumber(endDate);
    if (s !== null && e !== null && s > e) {
      setFilterError('Start date must be on or before end date.');
      return;
    }
    setFilterError('');
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  }

  function handleClearFilter() {
    setStartDate('');
    setEndDate('');
    setAppliedStart('');
    setAppliedEnd('');
    setFilterError('');
    setSearchQuery('');
    setModeFilter('ALL');
    setCategoryFilter('ALL');
  }

  const isFiltered = Boolean(appliedStart || appliedEnd || searchQuery || modeFilter !== 'ALL' || categoryFilter !== 'ALL');

  const filteredMeetings = useMemo(() => {
    return allMeetings.filter((m) => {
      // Date range filter
      if (appliedStart || appliedEnd) {
        const d = parseAnyDateToNumber(m.date);
        const s = parseAnyDateToNumber(appliedStart);
        const e = parseAnyDateToNumber(appliedEnd);
        if (d !== null) {
          if (s !== null && d < s) return false;
          if (e !== null && d > e) return false;
        }
      }

      // Mode filter
      if (modeFilter !== 'ALL' && m.mode !== modeFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && m.category !== categoryFilter) {
        return false;
      }

      // Search query filter (mentee name, roll number, topics, or agenda)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const menteeName = (m.menteeName || '').toLowerCase();
        const rollNumber = (m.rollNumber || '').toLowerCase();
        const topics = (m.topicsDiscussed || '').toLowerCase();
        const location = (m.location || '').toLowerCase();
        const agenda = Array.isArray(m.agenda) ? m.agenda.join(' ').toLowerCase() : '';
        if (
          !menteeName.includes(q) &&
          !rollNumber.includes(q) &&
          !topics.includes(q) &&
          !location.includes(q) &&
          !agenda.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allMeetings, appliedStart, appliedEnd, modeFilter, categoryFilter, searchQuery]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = allMeetings.length;
    const offline = allMeetings.filter((m) => m.mode === 'Offline').length;
    const online = allMeetings.filter((m) => m.mode === 'Online').length;
    const signed = allMeetings.filter((m) => m.signed || (m.mentorSigned && m.studentSigned)).length;
    return { total, offline, online, signed };
  }, [allMeetings]);

  async function handleDownloadConsolidatedPdf() {
    if (!filteredMeetings.length) return;
    setDownloadingPdf(true);
    setDownloadError(null);
    try {
      const rangeText = (appliedStart || appliedEnd)
        ? `From ${appliedStart || 'earliest'} to ${appliedEnd || 'latest'}`
        : 'All Recorded Meetings';
      await downloadConsolidatedReport(filteredMeetings, {
        isMentorWide: true,
        mentorName: 'Dr. Bharathi Priya',
        filterRangeText: rangeText,
      });
    } catch (err) {
      console.error('[MeetingsSection] PDF export failed:', err);
      setDownloadError('Failed to generate consolidated PDF report. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  }

  function handleDownloadExcel() {
    if (!filteredMeetings.length) return;
    setDownloadingExcel(true);
    setDownloadError(null);
    try {
      exportMeetingsToExcel(filteredMeetings, {
        title: 'MMRMS_Consolidated_Meetings_Report',
        mentorName: 'Dr. Bharathi Priya',
      });
    } catch (err) {
      console.error('[MeetingsSection] Excel export failed:', err);
      setDownloadError('Failed to export meetings to Excel. Please try again.');
    } finally {
      setDownloadingExcel(false);
    }
  }

  if (error) {
    return (
      <EmptyState
        title="Couldn't load meetings history"
        description={error.message}
        icon="!"
        action={
          <Button size="sm" variant="secondary" onClick={reload}>
            Try again
          </Button>
        }
      />
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeRise">
      {/* ── Headline Summary Tiles ──────────────────────────────────────── */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
          <p className="text-[11.5px] font-semibold uppercase tracking-[.06em] text-muted">Total Meetings</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-ink">{stats.total}</span>
            <span className="text-xs text-muted">across {data?.menteesCount ?? 0} mentees</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
          <p className="text-[11.5px] font-semibold uppercase tracking-[.06em] text-muted">Offline Meetings</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-800">{stats.offline}</span>
            <span className="text-xs text-slate-500">venue & location logged</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
          <p className="text-[11.5px] font-semibold uppercase tracking-[.06em] text-muted">Online Sessions</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-brand-700">{stats.online}</span>
            <span className="text-xs text-brand-600">via MS Teams</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
          <p className="text-[11.5px] font-semibold uppercase tracking-[.06em] text-muted">Compliance & Signatures</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-emerald-700">
              {stats.signed}
              <span className="text-sm font-normal text-muted"> / {stats.total}</span>
            </span>
            <Badge tone={stats.signed === stats.total ? 'green' : 'amber'}>
              {stats.total ? Math.round((stats.signed / stats.total) * 100) : 0}% signed
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Main Section Card with Controls ─────────────────────────────── */}
      <SectionCard
        section="Meetings"
        title="All Mentoring Meetings History"
        subtitle={`Chronological log of all mentoring sessions conducted for every mentee (${allMeetings.length} total)`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              loading={downloadingExcel}
              disabled={!filteredMeetings.length}
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 text-xs font-semibold"
              title="Download all filtered meetings in an Excel (.xlsx) spreadsheet"
            >
              <span>📊</span>
              <span>Download Excel</span>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              loading={downloadingPdf}
              disabled={!filteredMeetings.length}
              onClick={handleDownloadConsolidatedPdf}
              className="flex items-center gap-1.5 text-xs font-semibold"
              title="Download consolidated PDF report formatted with Kumaraguru header"
            >
              <span>📑</span>
              <span>Download Consolidated Report (PDF)</span>
            </Button>

            {onRecordMeeting && (
              <Button size="sm" onClick={onRecordMeeting} className="flex items-center gap-1 text-xs">
                <span>＋ Record a Meeting</span>
              </Button>
            )}
          </div>
        }
      >
        {/* ── Filter Bar ─────────────────────────────────────────────────── */}
        <div className="mb-4 space-y-3 rounded-xl border border-line bg-canvas/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
              Filter & Search Meetings
            </p>
            {isFiltered && (
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                Showing {filteredMeetings.length} of {allMeetings.length} meetings
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search by text */}
            <div className="flex flex-col gap-1">
              <label htmlFor="mentor-meetings-search" className="text-[10.5px] font-semibold text-muted">
                Search Mentee or Topic
              </label>
              <input
                id="mentor-meetings-search"
                type="text"
                placeholder="Search name, roll no, venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="focus-ring rounded-lg border border-line-strong bg-white px-2.5 py-1.5 text-[12.5px] text-ink placeholder-muted/80"
              />
            </div>

            {/* Date From */}
            <div className="flex flex-col gap-1">
              <label htmlFor="mentor-meeting-filter-from" className="text-[10.5px] font-semibold text-muted">
                From Date
              </label>
              <input
                id="mentor-meeting-filter-from"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="focus-ring rounded-lg border border-line-strong bg-white px-2.5 py-1.5 text-[12.5px] text-ink"
              />
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-1">
              <label htmlFor="mentor-meeting-filter-to" className="text-[10.5px] font-semibold text-muted">
                To Date
              </label>
              <input
                id="mentor-meeting-filter-to"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="focus-ring rounded-lg border border-line-strong bg-white px-2.5 py-1.5 text-[12.5px] text-ink"
              />
            </div>

            {/* Mode selection */}
            <div className="flex flex-col gap-1">
              <label htmlFor="mentor-meeting-filter-mode" className="text-[10.5px] font-semibold text-muted">
                Mode
              </label>
              <select
                id="mentor-meeting-filter-mode"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="focus-ring rounded-lg border border-line-strong bg-white px-2.5 py-1.5 text-[12.5px] text-ink"
              >
                <option value="ALL">All Modes (Offline & Online)</option>
                <option value="Offline">Offline Meetings</option>
                <option value="Online">Online (Teams) Meetings</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2.5">
            <div className="flex items-center gap-2">
              <Button
                id="mentor-meeting-filter-apply"
                size="sm"
                variant="secondary"
                onClick={handleApplyFilter}
                className="text-xs"
              >
                Apply Date Filter
              </Button>
              {isFiltered && (
                <Button
                  id="mentor-meeting-filter-clear"
                  size="sm"
                  variant="ghost"
                  onClick={handleClearFilter}
                  className="text-xs text-muted hover:text-bad-ink"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {filterError && (
              <p role="alert" className="text-[11.5px] font-medium text-bad-ink">
                {filterError}
              </p>
            )}
          </div>
        </div>

        {downloadError && (
          <div className="mb-4 rounded-lg border border-bad/30 bg-bad/5 p-3 text-xs text-bad-ink">
            {downloadError}
          </div>
        )}

        {/* ── Meetings List ──────────────────────────────────────────────── */}
        {!filteredMeetings.length ? (
          <EmptyState
            title="No meetings found"
            description={
              isFiltered
                ? 'No meetings match your current filter criteria. Try clearing or relaxing the filters.'
                : 'No mentoring meetings have been recorded yet.'
            }
            icon="◷"
            action={
              isFiltered ? (
                <Button size="sm" variant="secondary" onClick={handleClearFilter}>
                  Clear all filters
                </Button>
              ) : onRecordMeeting ? (
                <Button size="sm" onClick={onRecordMeeting}>
                  ＋ Record First Meeting
                </Button>
              ) : null
            }
          />
        ) : (
          <ol className="space-y-3" aria-label="Mentoring meetings history list">
            {filteredMeetings.map((meeting) => (
              <li key={`${meeting.menteeId}-${meeting.id}`}>
                <MeetingCard
                  meeting={meeting}
                  open={openMeetingId === `${meeting.menteeId}-${meeting.id}`}
                  onToggle={() =>
                    setOpenMeetingId((current) =>
                      current === `${meeting.menteeId}-${meeting.id}` ? null : `${meeting.menteeId}-${meeting.id}`,
                    )
                  }
                  onOpenMentee={onOpenMentee}
                />
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}

function MeetingCard({ meeting, open, onToggle, onOpenMentee }) {
  const [downloadError, setDownloadError] = useState(null);
  const [downloadingSingle, setDownloadingSingle] = useState(false);

  async function handleDownloadSingle(e) {
    e.stopPropagation();
    setDownloadError(null);
    setDownloadingSingle(true);
    try {
      await downloadMeetingReport(meeting, meeting.menteeName);
    } catch (err) {
      console.error('[MeetingCard] Single PDF download failed:', err);
      setDownloadError('Download failed.');
    } finally {
      setDownloadingSingle(false);
    }
  }

  const timingStr = meeting.startTime && meeting.endTime
    ? `${meeting.startTime} – ${meeting.endTime}`
    : meeting.startTime || meeting.endTime || '';

  return (
    <Card as="article" className={cx('overflow-hidden transition shadow-2xs', open && 'ring-1 ring-brand-300')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-canvas/50"
      >
        {/* Meeting Number Badge */}
        <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-ink text-white shadow-2xs">
          <span className="text-[8.5px] font-bold uppercase tracking-[.08em] opacity-60">Mtg</span>
          <span className="tnum text-[13.5px] font-bold leading-none">{meeting.number}</span>
        </span>

        {/* Meeting Primary Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mentee name & roll number */}
            <span
              onClick={(e) => {
                if (onOpenMentee && meeting.menteeId) {
                  e.stopPropagation();
                  onOpenMentee(meeting.menteeId, 'meetings');
                }
              }}
              className="text-[13.5px] font-bold text-ink hover:text-brand-600 hover:underline cursor-pointer"
              title="Open mentee record book"
            >
              {meeting.menteeName}
            </span>
            {meeting.rollNumber && (
              <span className="font-mono text-xs font-semibold text-muted">
                ({meeting.rollNumber})
              </span>
            )}
            <span className="text-muted text-xs">·</span>
            {/* Date */}
            <span className="tnum text-[12.5px] font-semibold text-ink-soft">
              {meeting.date}
            </span>
            {/* Timing */}
            {timingStr && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                ⏰ {timingStr}
              </span>
            )}
            {/* Duration */}
            <span className="text-[11.5px] text-muted">
              ({meeting.duration || `${meeting.durationMinutes || 30} min`})
            </span>
            {/* Mode */}
            <Badge tone={meeting.mode === 'Online' ? 'indigo' : 'slate'}>
              {meeting.mode}
            </Badge>
            {/* Location (offline) */}
            {meeting.mode === 'Offline' && meeting.location && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                📍 {meeting.location}
              </span>
            )}
            {/* Category */}
            {meeting.category && (
              <Badge tone="slate">{meeting.category}</Badge>
            )}
          </div>

          <p className="mt-1 truncate text-[11.5px] text-muted">
            <strong className="text-ink-soft font-medium">Discussion: </strong>
            {meeting.topicsDiscussed || (Array.isArray(meeting.agenda) ? meeting.agenda.join(' · ') : '—')}
          </p>
        </div>

        {/* Right side status & action */}
        <div className="flex items-center gap-2">
          {meeting.actionSummary?.total > 0 && (
            <Badge tone={meeting.actionSummary.closed === meeting.actionSummary.total ? 'green' : 'amber'}>
              {meeting.actionSummary.closed}/{meeting.actionSummary.total} actions
            </Badge>
          )}
          {meeting.signed || (meeting.mentorSigned && meeting.studentSigned) ? (
            <Badge tone="green">Signed ✓</Badge>
          ) : meeting.mentorSigned ? (
            <Badge tone="slate">Mentor Signed</Badge>
          ) : (
            <Badge tone="amber">Pending</Badge>
          )}

          <button
            type="button"
            onClick={handleDownloadSingle}
            disabled={downloadingSingle}
            className="focus-ring rounded-md border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-muted shadow-2xs transition hover:border-muted-soft hover:text-ink"
            title="Download individual meeting report (PDF)"
          >
            {downloadingSingle ? '...' : '↓ PDF'}
          </button>

          <span
            aria-hidden="true"
            className={cx('text-[10px] text-muted-soft transition duration-200', open && 'rotate-180')}
          >
            ▼
          </span>
        </div>
      </button>

      {downloadError && (
        <p role="alert" className="px-4 pb-2 text-[11.5px] text-bad-ink">
          {downloadError}
        </p>
      )}

      {/* Expanded view */}
      {open && (
        <div className="space-y-4 border-t border-line bg-canvas/40 px-5 py-5 text-ink">
          {/* Online meeting banner if Teams */}
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
                    {meeting.teamsJoinUrl ? 'Meeting link generated via Microsoft Graph' : 'Connect via Teams'}
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

          {/* Agenda items */}
          {Array.isArray(meeting.agenda) && meeting.agenda.length > 0 && (
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft mb-1.5">
                Agenda & Topics Covered
              </p>
              <div className="flex flex-wrap gap-1.5">
                {meeting.agenda.map((ag) => (
                  <span
                    key={ag}
                    className="inline-flex items-center rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink"
                  >
                    ✓ {ag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Minutes of Meeting */}
          <DefinitionList
            columns={1}
            items={[
              { key: 'Topics Discussed', value: meeting.topicsDiscussed || '—' },
              { key: 'Student Concerns', value: meeting.studentConcerns || 'None recorded.' },
              { key: 'Mentor Suggestions', value: meeting.mentorSuggestions || 'None recorded.' },
              { key: 'Support Required', value: meeting.supportRequired || 'None.' },
            ]}
          />

          {/* Location & Evidence */}
          <div className="rounded-xl border border-line bg-white p-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
              Meeting Location & Evidence
            </p>
            <div className="mt-1.5 space-y-1">
              <p className="text-[12.5px] text-ink font-medium">
                📍 <span className="text-muted text-[11.5px] font-normal">Location: </span>
                {meeting.location || (meeting.mode === 'Offline' ? 'Campus' : 'Microsoft Teams Online')}
              </p>
              {meeting.geotag && (
                <p className="text-[11.5px] text-muted">
                  GPS Coordinates: {meeting.geotag.latitude}, {meeting.geotag.longitude}
                  {meeting.geotag.accuracy ? ` (accuracy ${meeting.geotag.accuracy}m)` : ''} ·{' '}
                  <a
                    href={`https://www.google.com/maps?q=${meeting.geotag.latitude},${meeting.geotag.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand-600 hover:underline"
                  >
                    View Map ↗
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* Action Items */}
          {Array.isArray(meeting.actionItems) && meeting.actionItems.length > 0 && (
            <div>
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
                Action Items ({meeting.actionItems.length})
              </p>
              <div className="overflow-x-auto rounded-xl border border-line bg-white">
                <table className="w-full min-w-[500px] border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-line bg-canvas/60 text-[10.5px] uppercase tracking-[.06em] text-muted-soft">
                      <th className="px-3.5 py-2 font-semibold">#</th>
                      <th className="px-3.5 py-2 font-semibold">Task</th>
                      <th className="px-3.5 py-2 font-semibold">Responsible</th>
                      <th className="px-3.5 py-2 font-semibold">Target Date</th>
                      <th className="px-3.5 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {meeting.actionItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-canvas/30">
                        <td className="px-3.5 py-2 font-medium text-muted">{idx + 1}</td>
                        <td className="px-3.5 py-2 font-medium text-ink">{item.task}</td>
                        <td className="px-3.5 py-2 text-muted">{item.responsible || 'Student'}</td>
                        <td className="px-3.5 py-2 tnum text-muted">{item.targetDate || '—'}</td>
                        <td className="px-3.5 py-2">
                          <Badge tone={item.status === 'Completed' ? 'green' : item.status === 'In Progress' ? 'indigo' : 'amber'}>
                            {item.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progress Since Last Meeting */}
          {meeting.progressSinceLastMeeting && (
            <div>
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
                Progress Since Last Meeting
              </p>
              <DefinitionList
                columns={3}
                items={[
                  { key: 'Achievements', value: meeting.progressSinceLastMeeting.achievements || '—' },
                  { key: 'Pending Tasks', value: meeting.progressSinceLastMeeting.pendingTasks || '—' },
                  { key: 'Improvement Observed', value: meeting.progressSinceLastMeeting.improvementObserved || '—' },
                ]}
              />
            </div>
          )}

          {/* Remarks */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-white p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">Mentor Remarks</p>
              <p className="mt-1 text-[12px] text-ink">{meeting.mentorRemarks || 'No remarks recorded.'}</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">Student Remarks</p>
              <p className="mt-1 text-[12px] text-ink">{meeting.studentRemarks || 'No remarks recorded.'}</p>
            </div>
          </div>

          {/* Next review & signatures */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <p className="text-[12px] text-muted">
              Next review date:{' '}
              <strong className="tnum font-semibold text-ink">{meeting.nextReviewDate || 'Not set'}</strong>
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-muted">
                Mentor: {meeting.mentorSigned ? 'Signed ✓' : 'Pending'}
              </span>
              <span className="text-muted">·</span>
              <span className="text-[11.5px] text-muted">
                Student: {meeting.studentSigned ? 'Signed ✓' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
