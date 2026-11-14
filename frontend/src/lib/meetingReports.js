import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/** Month abbreviation → 1-based number. Matches both short and full month names. */
const MONTH_NUM = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  January: 1, February: 2, March: 3, April: 4, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

/**
 * Robust date parser converting any date string (ISO YYYY-MM-DD, DD-MM-YYYY,
 * "22 Jul 2026", "22-Jul-2026", etc.) into a comparable integer YYYYMMDD.
 */
export function parseAnyDateToNumber(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str) return null;

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    return y * 10000 + m * 100 + d;
  }

  // 2. Day-Month-Year: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    return y * 10000 + m * 100 + d;
  }

  // 3. DD Mon YYYY (e.g. "22 Jul 2026", "22-Jul-2026")
  const cleaned = str.replace(/[-/]/g, ' ');
  const parts = cleaned.split(/\s+/);
  if (parts.length === 3) {
    let [dPart, mPart, yPart] = parts;
    if (dPart.length === 4 && yPart.length <= 2) {
      [yPart, mPart, dPart] = [dPart, mPart, yPart];
    }
    const monKey = mPart.charAt(0).toUpperCase() + mPart.slice(1).toLowerCase();
    const monShort = monKey.slice(0, 3);
    const m = MONTH_NUM[monKey] || MONTH_NUM[monShort];
    const d = parseInt(dPart, 10);
    const y = parseInt(yPart, 10);
    if (m && Number.isFinite(d) && Number.isFinite(y)) {
      return y * 10000 + m * 100 + d;
    }
  }

  // 4. JS Date fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.getFullYear() * 10000 + (parsed.getMonth() + 1) * 100 + parsed.getDate();
  }

  return null;
}

/**
 * Loads the KSI logo image from the public directory and converts it to a Data URL.
 * Falls back safely if loading fails.
 */
export function getKsiLogoDataUrl() {
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
        console.warn('[meetingReports] Failed to convert logo canvas:', err);
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

/** Helper to format timing nicely */
function formatTiming(meeting) {
  if (meeting.startTime && meeting.endTime) {
    return `${meeting.startTime} – ${meeting.endTime}`;
  }
  return meeting.startTime || meeting.endTime || '—';
}

/** Helper to format location nicely */
function formatLocation(meeting) {
  if (meeting.mode === 'Offline') {
    if (meeting.location) return meeting.location;
    if (meeting.geotag?.latitude) {
      return `Lat ${meeting.geotag.latitude}, Long ${meeting.geotag.longitude}`;
    }
    return 'Campus';
  }
  return meeting.location || 'Online (Microsoft Teams)';
}

/**
 * Generates and triggers a PDF download for a single meeting record.
 * Renders the KSI logo at the top, meeting metadata (including Start Time,
 * End Time, Duration, Location), agenda, discussion, action items,
 * progress, goal progress, remarks, and signature status.
 *
 * @param {object} meeting - the meeting object
 * @param {string} menteeName - mentee full name
 */
export async function downloadMeetingReport(meeting, menteeName) {
  const dateSlug = String(meeting.date ?? '').replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '');
  const mName = menteeName || meeting.menteeName || 'Mentee';
  const menteeSlug = String(mName).replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '');
  const filename = `MMRMS_Meeting_Report_${meeting.number}_${menteeSlug}_${dateSlug}.pdf`;

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

  const timingStr = formatTiming(meeting);
  const locationStr = formatLocation(meeting);

  // 2. Summary Table with Date, Start/End Time, Duration, and Location
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
      ['Mentee Name', mName, 'Meeting Number', String(meeting.number ?? '—')],
      ['Meeting Date', String(meeting.date ?? '—'), 'Timing (Start – End)', timingStr],
      ['Mode', String(meeting.mode ?? '—'), 'Duration', String(meeting.duration ?? '—')],
      ['Category', String(meeting.category ?? '—'), 'Location', locationStr],
      ['Next Review Date', String(meeting.nextReviewDate ?? '—'), 'Signed Status', meeting.signed || (meeting.mentorSigned && meeting.studentSigned) ? 'Signed by Both ✓' : meeting.mentorSigned ? 'Signed by Mentor ✓' : 'Pending Signature'],
    ],
  });
  y = doc.lastAutoTable.finalY + 5;

  // 3. Agenda
  addSectionHeading('1. Agenda & Scope');
  const agendaList = Array.isArray(meeting.agenda) && meeting.agenda.length > 0
    ? meeting.agenda.map((a) => `• ${a}`).join('\n')
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
 * Generates and triggers a consolidated PDF download containing multiple meeting records.
 * Can be used for a single mentee or across all mentees of a mentor.
 *
 * @param {Array<object>} meetingsList - array of meeting records
 * @param {object|string} options - options object or menteeName string
 * @param {string} [legacyFilterRangeText] - fallback for backwards compatibility
 */
export async function downloadConsolidatedReport(meetingsList, options, legacyFilterRangeText = '') {
  if (!meetingsList || !meetingsList.length) return;

  let menteeName = '';
  let mentorName = 'Dr. Bharathi Priya';
  let filterRangeText = '';
  let isMentorWide = false;

  if (typeof options === 'string') {
    menteeName = options;
    filterRangeText = legacyFilterRangeText;
    isMentorWide = false;
  } else if (options && typeof options === 'object') {
    menteeName = options.menteeName || '';
    mentorName = options.mentorName || 'Dr. Bharathi Priya';
    filterRangeText = options.filterRangeText || '';
    isMentorWide = Boolean(options.isMentorWide);
  }

  const slug = isMentorWide
    ? 'All_Mentees'
    : String(menteeName || 'Mentee').replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '');
  const filename = `MMRMS_Consolidated_Meeting_Report_${slug}_${Date.now()}.pdf`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const logoInfo = await getKsiLogoDataUrl();

  const addSectionHeading = (title) => {
    if (y > 255) {
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

  // 1. Header with KSI Logo
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
    doc.text(
      isMentorWide ? 'CONSOLIDATED MENTOR MEETINGS REPORT' : 'CONSOLIDATED MENTORING MEETINGS REPORT',
      margin + logoWidth + 6,
      y + 16,
    );

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
    doc.text(
      isMentorWide ? 'CONSOLIDATED MENTOR MEETINGS REPORT' : 'CONSOLIDATED MENTORING MEETINGS REPORT',
      margin,
      y + 16,
    );
    y += 22;
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Overview Table
  const overviewBody = isMentorWide
    ? [
        ['Mentor Name', mentorName, 'Total Meetings', `${meetingsList.length} meeting(s)`],
        [
          'Report Period',
          filterRangeText || 'All Recorded Meetings',
          'Generated On',
          new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        ],
      ]
    : [
        ['Mentee Name', menteeName || '—', 'Meetings Count', `${meetingsList.length} meeting(s)`],
        [
          'Report Period',
          filterRangeText || 'All Recorded Meetings',
          'Generated On',
          new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        ],
      ];

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
    body: overviewBody,
  });
  y = doc.lastAutoTable.finalY + 5;

  // Summary Table of Included Meetings
  addSectionHeading('Summary of Included Meetings');

  const summaryColumns = isMentorWide
    ? [
        { header: '#', dataKey: 'number' },
        { header: 'Mentee', dataKey: 'mentee' },
        { header: 'Date', dataKey: 'date' },
        { header: 'Timing', dataKey: 'timing' },
        { header: 'Mode', dataKey: 'mode' },
        { header: 'Location', dataKey: 'location' },
        { header: 'Duration', dataKey: 'duration' },
        { header: 'Status', dataKey: 'status' },
      ]
    : [
        { header: '#', dataKey: 'number' },
        { header: 'Date', dataKey: 'date' },
        { header: 'Timing', dataKey: 'timing' },
        { header: 'Mode', dataKey: 'mode' },
        { header: 'Location', dataKey: 'location' },
        { header: 'Duration', dataKey: 'duration' },
        { header: 'Category', dataKey: 'category' },
        { header: 'Actions', dataKey: 'actions' },
        { header: 'Status', dataKey: 'status' },
      ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columns: summaryColumns,
    body: meetingsList.map((m) => {
      const timing = formatTiming(m);
      const loc = formatLocation(m);
      if (isMentorWide) {
        return {
          number: `Mtg ${m.number}`,
          mentee: `${m.rollNumber ? `${m.rollNumber} - ` : ''}${m.menteeName || menteeName || '—'}`,
          date: m.date || '—',
          timing,
          mode: m.mode || '—',
          location: loc,
          duration: m.duration || '—',
          status: m.signed || (m.mentorSigned && m.studentSigned) ? 'Signed ✓' : 'Pending',
        };
      }
      return {
        number: `Mtg ${m.number}`,
        date: m.date || '—',
        timing,
        mode: m.mode || '—',
        location: loc,
        duration: m.duration || '—',
        category: m.category || '—',
        actions: m.actionSummary
          ? `${m.actionSummary.closed}/${m.actionSummary.total}`
          : `${(m.actionItems || []).length} items`,
        status: m.signed || (m.mentorSigned && m.studentSigned) ? 'Signed ✓' : 'Pending',
      };
    }),
  });
  y = doc.lastAutoTable.finalY + 6;

  // Detailed Log for Each Meeting
  for (let i = 0; i < meetingsList.length; i++) {
    const meeting = meetingsList[i];
    const meetingMentee = meeting.menteeName || menteeName;

    if (y > 230 || i > 0) {
      doc.addPage();
      y = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    const meetingTitle = isMentorWide && meetingMentee
      ? `Meeting #${meeting.number} — ${meetingMentee} (${meeting.rollNumber || ''}) · ${meeting.date || 'Date not recorded'}`
      : `Meeting #${meeting.number} — ${meeting.date || 'Date not recorded'}`;
    doc.text(meetingTitle, margin, y + 4);
    y += 7;

    const timingStr = formatTiming(meeting);
    const locStr = formatLocation(meeting);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 35 },
        1: { cellWidth: 55 },
        2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 35 },
        3: { cellWidth: 57 },
      },
      body: [
        ['Date', String(meeting.date ?? '—'), 'Timing', timingStr],
        ['Mode', String(meeting.mode ?? '—'), 'Duration', String(meeting.duration ?? '—')],
        ['Category', String(meeting.category ?? '—'), 'Location', locStr],
        ['Next Review Date', String(meeting.nextReviewDate ?? '—'), 'Signed Status', meeting.mentorSigned ? 'Signed ✓' : 'Pending'],
      ],
    });
    y = doc.lastAutoTable.finalY + 4;

    addSectionHeading(`Meeting #${meeting.number} — Agenda & Scope`);
    const agendaList = Array.isArray(meeting.agenda) && meeting.agenda.length > 0
      ? meeting.agenda.map((a) => `• ${a}`).join('\n')
      : '• No agenda items listed.';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const agendaLines = doc.splitTextToSize(agendaList, contentWidth - 4);
    doc.text(agendaLines, margin + 2, y);
    y += agendaLines.length * 3.8 + 4;

    addSectionHeading(`Meeting #${meeting.number} — Minutes of Meeting`);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59], overflow: 'linebreak' },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
        1: { cellWidth: contentWidth - 38 },
      },
      body: [
        ['Topics Discussed', meeting.topicsDiscussed || '—'],
        ['Student Concerns', meeting.studentConcerns || '—'],
        ['Mentor Suggestions', meeting.mentorSuggestions || '—'],
        ['Support Required', meeting.supportRequired || '—'],
      ],
    });
    y = doc.lastAutoTable.finalY + 4;

    const prog = meeting.progressSinceLastMeeting || {};
    if (prog.achievements || prog.pendingTasks || prog.improvementObserved) {
      addSectionHeading(`Meeting #${meeting.number} — Progress Since Last Meeting`);
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59], overflow: 'linebreak' },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
          1: { cellWidth: contentWidth - 38 },
        },
        body: [
          ['Achievements', prog.achievements || '—'],
          ['Pending Tasks', prog.pendingTasks || '—'],
          ['Improvement Observed', prog.improvementObserved || '—'],
        ],
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    const actionItems = meeting.actionItems || [];
    if (actionItems.length > 0) {
      addSectionHeading(`Meeting #${meeting.number} — Action Items (${actionItems.length})`);
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
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
      y = doc.lastAutoTable.finalY + 4;
    }

    if (meeting.mentorRemarks || meeting.studentRemarks) {
      addSectionHeading(`Meeting #${meeting.number} — Remarks`);
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59], overflow: 'linebreak' },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
          1: { cellWidth: contentWidth - 38 },
        },
        body: [
          ['Mentor Remarks', meeting.mentorRemarks || '—'],
          ['Student Remarks', meeting.studentRemarks || '—'],
        ],
      });
      y = doc.lastAutoTable.finalY + 5;
    }
  }

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

    doc.text('Kumaraguru School of Innovation — MMRMS Consolidated Meeting Report', margin, 291);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 291, { align: 'right' });
  }

  doc.save(filename);
}

/**
 * Exports meetings to an Excel (.xlsx) file.
 *
 * @param {Array<object>} meetingsList - meetings to export
 * @param {object} options - { title, mentorName, menteeName }
 */
export function exportMeetingsToExcel(meetingsList, { title = 'MMRMS_Meetings_Report', mentorName = '', menteeName = '' } = {}) {
  if (!meetingsList || !meetingsList.length) return;

  const rows = meetingsList.map((m, idx) => ({
    'S.No': idx + 1,
    'Meeting #': m.number || idx + 1,
    'Mentee Roll Number': m.rollNumber || m.menteeRoll || '—',
    'Mentee Name': m.menteeName || menteeName || '—',
    'Date': m.date || '—',
    'Start Time': m.startTime || '—',
    'End Time': m.endTime || '—',
    'Duration': m.duration || (m.durationMinutes ? `${m.durationMinutes} min` : '—'),
    'Mode': m.mode || '—',
    'Location': formatLocation(m),
    'Category': m.category || '—',
    'Agenda': Array.isArray(m.agenda) ? m.agenda.join('; ') : (m.agenda || '—'),
    'Topics Discussed': m.topicsDiscussed || '—',
    'Student Concerns': m.studentConcerns || '—',
    'Mentor Suggestions': m.mentorSuggestions || '—',
    'Support Required': m.supportRequired || '—',
    'Action Items': Array.isArray(m.actionItems)
      ? m.actionItems.map((a) => `${a.task} (${a.responsible}, due: ${a.targetDate}, status: ${a.status})`).join(' | ')
      : '—',
    'Achievements': m.progressSinceLastMeeting?.achievements || '—',
    'Pending Tasks': m.progressSinceLastMeeting?.pendingTasks || '—',
    'Improvement Observed': m.progressSinceLastMeeting?.improvementObserved || '—',
    'Mentor Remarks': m.mentorRemarks || '—',
    'Student Remarks': m.studentRemarks || '—',
    'Next Review Date': m.nextReviewDate || '—',
    'Signed Status': m.signed || (m.mentorSigned && m.studentSigned) ? 'Signed by Both' : (m.mentorSigned ? 'Mentor Signed' : 'Pending'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 10 }, // Meeting #
    { wch: 16 }, // Mentee Roll Number
    { wch: 24 }, // Mentee Name
    { wch: 14 }, // Date
    { wch: 12 }, // Start Time
    { wch: 12 }, // End Time
    { wch: 12 }, // Duration
    { wch: 10 }, // Mode
    { wch: 28 }, // Location
    { wch: 18 }, // Category
    { wch: 30 }, // Agenda
    { wch: 40 }, // Topics Discussed
    { wch: 30 }, // Student Concerns
    { wch: 30 }, // Mentor Suggestions
    { wch: 25 }, // Support Required
    { wch: 45 }, // Action Items
    { wch: 30 }, // Achievements
    { wch: 25 }, // Pending Tasks
    { wch: 25 }, // Improvement Observed
    { wch: 30 }, // Mentor Remarks
    { wch: 30 }, // Student Remarks
    { wch: 16 }, // Next Review Date
    { wch: 18 }, // Signed Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Meetings');
  XLSX.writeFile(workbook, `${title}_${Date.now()}.xlsx`);
}
