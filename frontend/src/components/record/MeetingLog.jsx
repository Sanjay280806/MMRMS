import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
 * Loads the KSI logo image from the public directory and converts it to a Data URL.
 * Falls back safely if loading fails.
 */
function getKsiLogoDataUrl() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg'),
          width: canvas.width,
          height: canvas.height,
        });
      } catch (err) {
        console.warn('[MeetingLog] Failed to convert logo canvas:', err);
        resolve(null);
      }
    };
    img.onerror = () => {
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'Anonymous';
      fallbackImg.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = fallbackImg.naturalWidth || fallbackImg.width;
          canvas.height = fallbackImg.naturalHeight || fallbackImg.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(fallbackImg, 0, 0);
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg'),
            width: canvas.width,
            height: canvas.height,
          });
        } catch (e) {
          resolve(null);
        }
      };
      fallbackImg.onerror = () => resolve(null);
      fallbackImg.src = '/KI%20KSI%20LOGO.jpg';
    };
    img.src = '/ksi-logo.jpg';
  });
}

/**
 * Generates and triggers a PDF download for a single meeting record.
 * Renders the KSI logo at the top, meeting metadata, agenda, discussion,
 * action items, progress, goal progress, remarks, and signature status.
 *
 * @param {object} meeting - the decorated meeting object from the API
 * @param {string} menteeName - the mentee's full name for the report header
 */
async function downloadMeetingReport(meeting, menteeName) {
  const dateSlug = String(meeting.date ?? '').replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '');
  const filename = `MMRMS_Meeting_Report_${meeting.number}_${dateSlug}.pdf`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // 1. Header with KSI Logo
  const logoInfo = await getKsiLogoDataUrl();
  if (logoInfo && logoInfo.dataUrl) {
    const logoWidth = 45;
    const logoHeight = (logoInfo.height / logoInfo.width) * logoWidth;
    doc.addImage(logoInfo.dataUrl, 'JPEG', margin, y, logoWidth, logoHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('KUMARAGURU SCHOOL OF INNOVATION', margin + logoWidth + 6, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('MENTOR–MENTEE RELATIONSHIP MANAGEMENT SYSTEM', margin + logoWidth + 6, y + 10);

    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`MEETING REPORT — MEETING #${meeting.number}`, margin + logoWidth + 6, y + 16);

    y += Math.max(logoHeight, 18) + 4;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('KUMARAGURU SCHOOL OF INNOVATION', margin, y + 5);
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text('MENTOR–MENTEE RELATIONSHIP MANAGEMENT SYSTEM', margin, y + 10);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`MEETING REPORT — MEETING #${meeting.number}`, margin, y + 16);
    y += 22;
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  const addSectionHeading = (title) => {
    if (y > 260) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.text(title, margin + 3, y + 4.5);
    y += 8.5;
  };

  // 2. Summary Table
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      1: { cellWidth: 53 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      3: { cellWidth: 53 },
    },
    body: [
      ['Mentee Name', menteeName || '—', 'Meeting Number', String(meeting.number ?? '—')],
      ['Meeting Date', String(meeting.date ?? '—'), 'Mode', String(meeting.mode ?? '—')],
      ['Category', String(meeting.category ?? '—'), 'Duration', String(meeting.duration ?? '—')],
      ['Next Review Date', String(meeting.nextReviewDate ?? '—'), 'Signed Status', meeting.signed ? 'Signed ✓' : 'Pending Signature'],
    ],
  });
  y = doc.lastAutoTable.finalY + 5;

  // 3. Agenda
  addSectionHeading('1. Agenda & Scope');
  const agendaList = Array.isArray(meeting.agenda) && meeting.agenda.length > 0
    ? meeting.agenda.map(a => `• ${a}`).join('\n')
    : '• No agenda items listed.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const agendaLines = doc.splitTextToSize(agendaList, contentWidth - 4);
  doc.text(agendaLines, margin + 2, y);
  y += agendaLines.length * 4 + 4;

  // 4. Minutes of Meeting
  addSectionHeading('2. Minutes of Meeting');
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [30, 41, 59], overflow: 'linebreak' },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      1: { cellWidth: contentWidth - 42 },
    },
    body: [
      ['Topics Discussed', meeting.topicsDiscussed || '—'],
      ['Student Concerns', meeting.studentConcerns || '—'],
      ['Mentor Suggestions', meeting.mentorSuggestions || '—'],
      ['Support Required', meeting.supportRequired || '—'],
    ],
  });
  y = doc.lastAutoTable.finalY + 5;

  // 5. Progress Since Last Meeting
  addSectionHeading('3. Progress Since Last Meeting');
  const prog = meeting.progressSinceLastMeeting || {};
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [30, 41, 59], overflow: 'linebreak' },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      1: { cellWidth: contentWidth - 42 },
    },
    body: [
      ['Achievements', prog.achievements || '—'],
      ['Pending Tasks', prog.pendingTasks || '—'],
      ['Improvement Observed', prog.improvementObserved || '—'],
    ],
  });
  y = doc.lastAutoTable.finalY + 5;

  // 6. Action Items
  addSectionHeading('4. Action Items');
  const actionItems = meeting.actionItems || [];
  if (actionItems.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      columns: [
        { header: '#', dataKey: 'idx' },
        { header: 'Task', dataKey: 'task' },
        { header: 'Responsible', dataKey: 'responsible' },
        { header: 'Target Date', dataKey: 'targetDate' },
        { header: 'Status', dataKey: 'status' },
      ],
      body: actionItems.map((item, idx) => ({
        idx: idx + 1,
        task: item.task || '—',
        responsible: item.responsible || '—',
        targetDate: item.targetDate || '—',
        status: item.status || '—',
      })),
    });
    y = doc.lastAutoTable.finalY + 5;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No action items recorded for this meeting.', margin + 2, y);
    y += 7;
  }

  // 7. SMART Goal Progress
  addSectionHeading('5. SMART Goal Progress');
  const goalProgress = meeting.goalProgress || [];
  if (goalProgress.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      columns: [
        { header: '#', dataKey: 'idx' },
        { header: 'Goal', dataKey: 'goal' },
        { header: 'Current Status', dataKey: 'status' },
        { header: 'Progress', dataKey: 'progress' },
      ],
      body: goalProgress.map((gp, idx) => ({
        idx: idx + 1,
        goal: gp.goal || gp.goalId || '—',
        status: gp.currentStatus || '—',
        progress: `${gp.progress ?? 0}%`,
      })),
    });
    y = doc.lastAutoTable.finalY + 5;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No goal progress recorded for this meeting.', margin + 2, y);
    y += 7;
  }

  // 8. Remarks & Review
  addSectionHeading('6. Remarks & Review');
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [30, 41, 59], overflow: 'linebreak' },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      1: { cellWidth: contentWidth - 42 },
    },
    body: [
      ['Mentor Remarks', meeting.mentorRemarks || '—'],
      ['Student Remarks', meeting.studentRemarks || '—'],
      ['Next Review Date', meeting.nextReviewDate || '—'],
    ],
  });
  y = doc.lastAutoTable.finalY + 5;

  // 9. Signatures & Verification
  addSectionHeading('7. Verification & Signatures');
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      1: { cellWidth: (contentWidth - 84) / 2 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      3: { cellWidth: (contentWidth - 84) / 2 },
    },
    body: [
      [
        'Mentor Signature',
        meeting.mentorSigned ? 'Signed ✓' : 'Pending Signature',
        'Student Signature',
        meeting.studentSigned ? 'Signed ✓' : 'Pending Signature',
      ],
    ],
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, 287, pageWidth - margin, 287);

    doc.text('Kumaraguru School of Innovation — MMRMS Meeting Report', margin, 291);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 291, { align: 'right' });
  }

  doc.save(filename);
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
