import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getKsiLogoDataUrl } from './meetingReports.js';

/**
 * Downloads a professionally formatted PDF report for the mentee analytics view.
 * If filters or search are applied, only the filtered mentees are exported.
 *
 * @param {Array<object>} menteesList - Array of mentee analytics records (filtered)
 * @param {object} options
 * @param {string} options.filterTitle - Active filter name (e.g., 'Attended Hackathons')
 * @param {string} [options.filterSubtitle] - Short explanatory text
 * @param {string} [options.mentorName] - Mentor's full name
 * @param {string} [options.searchQuery] - Active search query if any
 */
export async function downloadMenteeAnalyticsPdf(menteesList, {
  filterTitle = 'All Mentees',
  filterSubtitle = '',
  mentorName = 'Dr. Bharathi Priya',
  searchQuery = '',
} = {}) {
  if (!menteesList || !menteesList.length) return;

  const filterSlug = String(filterTitle)
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '');
  const filename = `MMRMS_Mentee_Report_${filterSlug}_${Date.now()}.pdf`;

  // Use landscape for wide multi-column analytics data
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 269 mm
  let y = margin;

  // 1. Header with Kumaraguru Logo
  const logoInfo = await getKsiLogoDataUrl();
  if (logoInfo && logoInfo.dataUrl) {
    const logoWidth = 42;
    const logoHeight = (logoInfo.height / logoInfo.width) * logoWidth;
    doc.addImage(logoInfo.dataUrl, 'JPEG', margin, y, logoWidth, logoHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text('KUMARAGURU SCHOOL OF INNOVATION', margin + logoWidth + 6, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('MENTOR–MENTEE RELATIONSHIP MANAGEMENT SYSTEM (MMRMS)', margin + logoWidth + 6, y + 10);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('MENTEE ANALYTICAL & PERFORMANCE REPORT', margin + logoWidth + 6, y + 16);

    y += Math.max(logoHeight, 18) + 4;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('KUMARAGURU SCHOOL OF INNOVATION', margin, y + 5);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('MENTOR–MENTEE RELATIONSHIP MANAGEMENT SYSTEM (MMRMS)', margin, y + 10);

    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text('MENTEE ANALYTICAL & PERFORMANCE REPORT', margin, y + 16);
    y += 22;
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4.5;

  // 2. Filter & Context Banner Box
  const filterBoxY = y;
  const filterBoxH = 14;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, filterBoxY, contentWidth, filterBoxH, 2, 2, 'FD');

  // Left side: Filter information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Active Filter: ${filterTitle}`, margin + 4, filterBoxY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const searchNote = searchQuery ? ` · Search: "${searchQuery}"` : '';
  const subText = `${menteesList.length} student${menteesList.length === 1 ? '' : 's'} matching criteria${searchNote}`;
  doc.text(subText, margin + 4, filterBoxY + 10.5);

  // Right side: Mentor & Generation time
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Mentor: ${mentorName}`, pageWidth - margin - 4, filterBoxY + 5.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated on: ${dateStr}`, pageWidth - margin - 4, filterBoxY + 10.5, { align: 'right' });

  y += filterBoxH + 4;

  // 3. Quick Summary KPI Ribbon
  const totalStudents = menteesList.length || 1;
  const avgCgpa = (
    menteesList.reduce((acc, m) => acc + (Number(m.cgpa) || 0), 0) / totalStudents
  ).toFixed(2);
  const hackathonsCount = menteesList.filter((m) => m.hasAttendedHackathon).length;
  const placementCompleteCount = menteesList.filter((m) => m.placementProfile?.isComplete).length;
  const cert5Count = menteesList.filter((m) => m.has5PlusCertifications).length;
  const distinctionCount = menteesList.filter((m) => m.isHighCgpa).length;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59], halign: 'center' },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [241, 245, 249] },
      1: { fontStyle: 'bold', fillColor: [241, 245, 249] },
      2: { fontStyle: 'bold', fillColor: [241, 245, 249] },
      3: { fontStyle: 'bold', fillColor: [241, 245, 249] },
      4: { fontStyle: 'bold', fillColor: [241, 245, 249] },
      5: { fontStyle: 'bold', fillColor: [241, 245, 249] },
    },
    body: [
      [
        `Students\n${menteesList.length}`,
        `Avg CGPA\n${avgCgpa}`,
        `Hackathons\n${hackathonsCount} (${Math.round((hackathonsCount / totalStudents) * 100)}%)`,
        `Placement Verified\n${placementCompleteCount} (${Math.round((placementCompleteCount / totalStudents) * 100)}%)`,
        `≥ 5 Certs\n${cert5Count}`,
        `CGPA > 8.0\n${distinctionCount}`,
      ],
    ],
  });
  y = doc.lastAutoTable.finalY + 4;

  // 4. Detailed Data Table
  const tableRows = menteesList.map((m, idx) => {
    // Format Hackathons
    let hackathonSummary = '—';
    if (m.hasAttendedHackathon) {
      hackathonSummary = `${m.hackathons.length} event${m.hackathons.length > 1 ? 's' : ''}`;
      if (m.hackathons[0]?.activity) {
        hackathonSummary += `\n• ${m.hackathons[0].activity}`;
      }
    }

    // Format Placement
    let placementSummary = 'Pending';
    if (m.placementProfile?.isComplete) {
      placementSummary = 'Complete (All 4 ✓)';
    } else if (m.placementProfile?.missingItems?.length) {
      placementSummary = `Pending:\n${m.placementProfile.missingItems.join(', ')}`;
    }

    // Format Certifications
    let certSummary = '—';
    if (m.certificationsCount > 0) {
      certSummary = `${m.certificationsCount} Course${m.certificationsCount > 1 ? 's' : ''}`;
      if (m.certifications[0]?.certification) {
        certSummary += `\n• ${m.certifications[0].certification}`;
      }
    }

    // Format Projects
    let projectSummary = 'No projects';
    if (m.projectsCount > 0) {
      projectSummary = `${m.projectsCount} Project${m.projectsCount > 1 ? 's' : ''}`;
      if (m.projects[0]?.title) {
        projectSummary += `\n• ${m.projects[0].title}`;
      }
    }

    // Format Status / Attention
    let statusText = 'Normal';
    if (m.needsAttention && m.attentionFlags?.length) {
      statusText = m.attentionFlags.map((f) => f.label).join('\n');
    } else if (m.isHighCgpa && m.placementProfile?.isComplete) {
      statusText = 'Exemplary';
    }

    return [
      idx + 1,
      m.rollNumber,
      m.name,
      `Year ${m.year || '—'}\n(${m.section || 'A'})`,
      Number(m.cgpa || 0).toFixed(1),
      `${m.attendance || 0}%`,
      hackathonSummary,
      placementSummary,
      certSummary,
      projectSummary,
      statusText,
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[
      '#',
      'Roll No',
      'Student Name',
      'Year/Sec',
      'CGPA',
      'Attnd',
      'Hackathons',
      'Placement Profile',
      'Certificates',
      'Projects',
      'Status / Flags',
    ]],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 36, fontStyle: 'bold' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 14, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 14, halign: 'right' },
      6: { cellWidth: 35 },
      7: { cellWidth: 35 },
      8: { cellWidth: 30 },
      9: { cellWidth: 28 },
      10: { cellWidth: 25 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      // Running header on page 2+
      if (data.pageNumber > 1) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Kumaraguru School of Innovation — MMRMS Mentee Report (${filterTitle})`,
          margin,
          10,
        );
        doc.line(margin, 12, pageWidth - margin, 12);
      }
    },
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
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.text(
      'Kumaraguru School of Innovation — Mentor–Mentee Relationship Management System (MMRMS)',
      margin,
      pageHeight - 6,
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  doc.save(filename);
}

/**
 * Exports the filtered mentee analytics roster to an Excel spreadsheet (.xlsx).
 *
 * @param {Array<object>} menteesList - Array of mentee analytics records (filtered)
 * @param {object} options
 * @param {string} options.filterTitle - Active filter name
 * @param {string} [options.mentorName] - Mentor's name
 */
export function downloadMenteeAnalyticsExcel(menteesList, {
  filterTitle = 'All Mentees',
  mentorName = 'Dr. Bharathi Priya',
} = {}) {
  if (!menteesList || !menteesList.length) return;

  const rows = menteesList.map((m, idx) => ({
    'S.No': idx + 1,
    'Roll Number': m.rollNumber,
    'Student Name': m.name,
    'Year': m.year,
    'Section': m.section || 'A',
    'CGPA': m.cgpa,
    'Attendance %': `${m.attendance}%`,
    'Hackathons Count': m.hackathons?.length || 0,
    'Hackathons Details': m.hackathons?.map((h) => `${h.activity} (${h.role || 'Participant'})`).join('; ') || 'None',
    'Placement Profile Status': m.placementProfile?.isComplete ? 'Complete' : 'Pending',
    'Missing Placement Items': m.placementProfile?.missingItems?.join(', ') || 'None',
    'Resume Uploaded': m.placementProfile?.hasResume ? 'Yes' : 'No',
    'GitHub Linked': m.placementProfile?.hasGithub ? 'Yes' : 'No',
    'LinkedIn Linked': m.placementProfile?.hasLinkedin ? 'Yes' : 'No',
    'Coding Platforms Active': m.placementProfile?.hasCoding ? 'Yes' : 'No',
    'Certifications Count': m.certificationsCount || 0,
    'Certifications Details': m.certifications?.map((c) => `${c.certification} (${c.platform || 'Online'})`).join('; ') || 'None',
    'Projects Count': m.projectsCount || 0,
    'Project Titles': m.projects?.map((p) => `${p.title}${p.guide ? ` [Guide: ${p.guide}]` : ''}`).join('; ') || 'None',
    'Meetings Held': m.meetingsHeld ?? 0,
    'Meetings Due': m.meetingsDue ?? 4,
    'Meetings Overdue': m.meetingsOverdue ?? 0,
    'Last Meeting Date': m.lastMeeting || '—',
    'Requires Attention': m.needsAttention ? 'Yes' : 'No',
    'Attention Flags': m.attentionFlags?.map((f) => f.label).join('; ') || 'None',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 16 }, // Roll Number
    { wch: 26 }, // Student Name
    { wch: 8 },  // Year
    { wch: 10 }, // Section
    { wch: 8 },  // CGPA
    { wch: 14 }, // Attendance %
    { wch: 18 }, // Hackathons Count
    { wch: 35 }, // Hackathons Details
    { wch: 24 }, // Placement Profile Status
    { wch: 30 }, // Missing Placement Items
    { wch: 16 }, // Resume Uploaded
    { wch: 16 }, // GitHub Linked
    { wch: 16 }, // LinkedIn Linked
    { wch: 22 }, // Coding Platforms Active
    { wch: 20 }, // Certifications Count
    { wch: 35 }, // Certifications Details
    { wch: 14 }, // Projects Count
    { wch: 35 }, // Project Titles
    { wch: 14 }, // Meetings Held
    { wch: 14 }, // Meetings Due
    { wch: 16 }, // Meetings Overdue
    { wch: 18 }, // Last Meeting Date
    { wch: 18 }, // Requires Attention
    { wch: 35 }, // Attention Flags
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mentee Report');

  const filterSlug = String(filterTitle)
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '');
  XLSX.writeFile(workbook, `MMRMS_Mentee_Report_${filterSlug}_${Date.now()}.xlsx`);
}

/**
 * Downloads a specialized PDF report for the Students Needing Attention section.
 *
 * @param {Array<object>} menteesList - Attention-flagged mentees
 * @param {object} options
 */
export async function downloadAttentionListPdf(menteesList, {
  attentionFilterLabel = 'All Flagged Mentees',
  mentorName = 'Dr. Bharathi Priya',
} = {}) {
  if (!menteesList || !menteesList.length) return;

  const filename = `MMRMS_Attention_Report_${Date.now()}.pdf`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header
  const logoInfo = await getKsiLogoDataUrl();
  if (logoInfo && logoInfo.dataUrl) {
    const logoWidth = 40;
    const logoHeight = (logoInfo.height / logoInfo.width) * logoWidth;
    doc.addImage(logoInfo.dataUrl, 'JPEG', margin, y, logoWidth, logoHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('KUMARAGURU SCHOOL OF INNOVATION', margin + logoWidth + 6, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('MENTOR–MENTEE RELATIONSHIP MANAGEMENT SYSTEM (MMRMS)', margin + logoWidth + 6, y + 10);

    doc.setFontSize(10.5);
    doc.setTextColor(190, 18, 60); // Crimson accent for attention
    doc.text('STUDENTS NEEDING ATTENTION & INTERVENTION REPORT', margin + logoWidth + 6, y + 16);

    y += Math.max(logoHeight, 18) + 4;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text('KUMARAGURU SCHOOL OF INNOVATION', margin, y + 5);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('MENTOR–MENTEE RELATIONSHIP MANAGEMENT SYSTEM (MMRMS)', margin, y + 10);

    doc.setFontSize(11);
    doc.setTextColor(190, 18, 60);
    doc.text('STUDENTS NEEDING ATTENTION & INTERVENTION REPORT', margin, y + 16);
    y += 22;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4.5;

  // Category Banner
  doc.setFillColor(255, 241, 242); // Rose tint
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(margin, y, contentWidth, 13, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(159, 18, 57);
  doc.text(`Attention Category: ${attentionFilterLabel}`, margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(190, 24, 93);
  doc.text(`${menteesList.length} students requiring mentor intervention`, margin + 4, y + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`Mentor: ${mentorName}`, pageWidth - margin - 4, y + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated on: ${new Date().toLocaleDateString('en-GB')}`,
    pageWidth - margin - 4,
    y + 9.5,
    { align: 'right' },
  );

  y += 17;

  // Attention Table
  const tableRows = menteesList.map((m, idx) => [
    idx + 1,
    `${m.rollNumber}\n${m.name}`,
    `Year ${m.year} (${m.section || 'A'})`,
    `CGPA: ${Number(m.cgpa || 0).toFixed(1)}\nAttnd: ${m.attendance || 0}%`,
    m.attentionFlags?.map((f) => `• ${f.label}`).join('\n') || 'Flagged for review',
    m.meetingsOverdue > 0 ? `${m.meetingsOverdue} Overdue` : 'Up-to-date',
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Student Details', 'Class', 'Standing', 'Intervention Required', 'Meetings']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [159, 18, 57], // Deep rose header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 46, fontStyle: 'bold' },
      2: { cellWidth: 24 },
      3: { cellWidth: 28 },
      4: { cellWidth: 50 },
      5: { cellWidth: 24, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [255, 241, 242, 0.4],
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.text('Kumaraguru School of Innovation — MMRMS Attention Log', margin, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  doc.save(filename);
}
