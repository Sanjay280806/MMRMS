import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Normalizes unicode characters (like ≥, ≤, em-dash, smart quotes) into safe ASCII equivalents
 * so jsPDF's built-in Helvetica font renders them cleanly without corruption.
 */
function sanitizePdfText(text) {
  if (text == null) return '';
  return String(text)
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/’/g, "'")
    .replace(/‘/g, "'")
    .replace(/”/g, '"')
    .replace(/“/g, '"')
    .replace(/…/g, '...')
    .replace(/±/g, '+/-');
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
        console.warn('[overallStudentReviewPdf] Failed to convert logo canvas:', err);
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
 * Generates and downloads the comprehensive Overall Student Review PDF
 * representing all 16 sections of the student's complete MMRMS Record Book.
 */
export async function downloadOverallStudentReview(data) {
  if (!data) return;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  // Helper to add styled section headers with auto page breaking
  const addSectionHeading = (title) => {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(sanitizePdfText(title).toUpperCase(), margin, y);
    y += 2;
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  // 1. Header with Logo
  const logo = await getKsiLogoDataUrl();
  if (logo && logo.dataUrl) {
    const logoW = 28;
    const logoH = (logo.height / logo.width) * logoW;
    doc.addImage(logo.dataUrl, 'JPEG', margin, y, logoW, Math.min(logoH, 18));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('KUMARAGURU SCHOOL OF INNOVATION', margin + logoW + 5, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('MENTOR-MENTEE RELATIONSHIP MANAGEMENT SYSTEM', margin + logoW + 5, y + 10);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('OVERALL STUDENT REVIEW REPORT', margin + logoW + 5, y + 16);
    y += Math.max(logoH, 18) + 4;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('KUMARAGURU SCHOOL OF INNOVATION', margin, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('MENTOR-MENTEE RELATIONSHIP MANAGEMENT SYSTEM', margin, y + 9);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('OVERALL STUDENT REVIEW REPORT', margin, y + 15);
    y += 20;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  const identity = data.identity || {};
  const mentor = identity.mentor || {};
  const institution = data.institution || {};
  const health = data.health || {};
  const sectionOne = data.sectionOne || {};
  const performance = data.performance || {};
  const attendance = data.attendance || {};
  const coursePerformance = data.coursePerformance || {};
  const arrears = data.arrears || {};
  const participation = data.participation || {};
  const certifications = data.certifications || {};
  const placementReadiness = data.placementReadiness || {};
  const internshipAndProject = data.internshipAndProject || {};
  const wellbeing = data.wellbeing || {};
  const parentInteractions = data.parentInteractions || {};
  const meetings = data.meetings || {};
  const goals = data.goals || [];
  const support = data.support || {};
  const roster = data.roster || {};

const MONTH_MAP = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

function parseMeetingDateToNum(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return y * 10000 + m * 100 + d;
  }
  const parts = str.split(/\s+/);
  if (parts.length === 3) {
    const [d, mon, y] = parts;
    const m = MONTH_MAP[mon];
    const day = parseInt(d, 10);
    const year = parseInt(y, 10);
    if (m && Number.isFinite(day) && Number.isFinite(year)) {
      return year * 10000 + m * 100 + day;
    }
  }
  return null;
}

  const meetingRows = meetings.rows || [];
  // Find the latest valid meeting date across all conducted meetings regardless of array order
  let latestMeetingDate = roster.lastMeeting || '—';
  if (meetingRows.length > 0) {
    let maxVal = -1;
    let maxDateStr = null;
    for (const m of meetingRows) {
      const val = parseMeetingDateToNum(m.date);
      if (val !== null && val > maxVal) {
        maxVal = val;
        maxDateStr = m.date;
      }
    }
    if (maxDateStr) {
      latestMeetingDate = maxDateStr;
    } else if (meetingRows[0]?.date) {
      latestMeetingDate = meetingRows[0].date;
    }
  }

  // SECTION 1 — STUDENT PROFILE
  addSectionHeading('Section 1 — Student Profile');
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      1: { cellWidth: 53 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      3: { cellWidth: 53 },
    },
    body: [
      ['Student Name', sanitizePdfText(identity.name || '—'), 'Roll Number', sanitizePdfText(identity.rollNumber || '—')],
      ['Register Number', sanitizePdfText(identity.registerNumber || '—'), 'Department', sanitizePdfText(identity.department || '—')],
      ['Programme', sanitizePdfText(identity.programme || '—'), 'Year & Semester', sanitizePdfText(`${identity.year || '—'} · Sem ${identity.semester || '—'}`)],
      ['Batch', sanitizePdfText(identity.batch || '—'), 'Section', sanitizePdfText(identity.section || '—')],
      ['Date of Birth', sanitizePdfText(identity.dateOfBirth || '—'), 'Blood Group', sanitizePdfText(identity.bloodGroup || '—')],
      ['Mobile Number', sanitizePdfText(identity.mobile || '—'), 'Email ID', sanitizePdfText(identity.email || '—')],
      ['Parent / Guardian', sanitizePdfText(identity.parentName || '—'), 'Parent Contact', sanitizePdfText(identity.parentContact || '—')],
      ['Residence Category', sanitizePdfText(identity.hostelOrDayScholar || '—'), 'Mentor Since', sanitizePdfText(identity.mentorSince || '—')],
      ['Year Coordinator', sanitizePdfText(identity.yearCoordinator || '—'), 'Address', sanitizePdfText(identity.address || '—')],
    ],
  });
  y = doc.lastAutoTable.finalY + 6;

  // SECTION 2 — MENTOR & INSTITUTION
  addSectionHeading('Section 2 — Mentor & Institution Information');
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      1: { cellWidth: 53 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      3: { cellWidth: 53 },
    },
    body: [
      ['Mentor Name', sanitizePdfText(mentor.name || '—'), 'Mentor Designation', sanitizePdfText(mentor.designation || '—')],
      ['Mentor Department', sanitizePdfText(mentor.department || '—'), 'Mentor Cabin', sanitizePdfText(mentor.cabin || '—')],
      ['Mentor Email', sanitizePdfText(mentor.email || '—'), 'Mentor Mobile', sanitizePdfText(mentor.mobile || '—')],
      ['Institution', sanitizePdfText(institution.name || 'Kumaraguru School of Innovation'), 'Academic Term', sanitizePdfText(institution.term || '2026-2027')],
      ['Review Cycle', sanitizePdfText(roster.reviewCycle || 'Fortnightly'), 'Last Meeting Date', sanitizePdfText(latestMeetingDate)],
    ],
  });
  y = doc.lastAutoTable.finalY + 6;

  // SECTION 3 — HEALTH / RISK OVERVIEW
  addSectionHeading('Section 3 — Health & Risk Overview');
  const dims = health.dimensions || [];
  const getDimValue = (key) => {
    const found = dims.find((d) => d.key === key || d.label?.toLowerCase().includes(key));
    return found ? `${found.value}/100 (${found.tone || 'normal'})` : '—';
  };

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      1: { cellWidth: 53 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      3: { cellWidth: 53 },
    },
    body: [
      ['Overall Health Index', String(health.index ?? '—'), 'Health Label / Tone', sanitizePdfText(`${health.label || '—'} (${health.tone || '—'})`) ],
      ['Academic Score', sanitizePdfText(getDimValue('academic')), 'Attendance Score', sanitizePdfText(getDimValue('attendance'))],
      ['Interaction Score', sanitizePdfText(getDimValue('interaction')), 'Career Score', sanitizePdfText(getDimValue('career'))],
      ['Well-being Score', sanitizePdfText(getDimValue('wellbeing')), 'Weakest Dimension', sanitizePdfText(health.weakest?.name ? `${health.weakest.name} (${health.weakest.value})` : '—')],
    ],
  });
  y = doc.lastAutoTable.finalY + 4;
  if (health.weakest?.explanation) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Note: ${sanitizePdfText(health.weakest.explanation)}`, margin + 2, y + 3);
    y += 7;
  }
  y += 2;

  // SECTION 4 — BACKGROUND & ASSESSMENTS
  addSectionHeading('Section 4 — Background & Mentor Assessments');
  const bg = sectionOne.academicBackground || {};
  const asp = sectionOne.aspirations || {};
  const skills = sectionOne.skillAssessment || [];
  const self = sectionOne.selfAssessment || {};
  const ment = sectionOne.mentorAssessment || {};

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      1: { cellWidth: 53 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      3: { cellWidth: 53 },
    },
    body: [
      ['10th Percentage', bg.tenthPercentage ? `${bg.tenthPercentage}%` : '—', 'Qualifying Exam', sanitizePdfText(`${bg.qualifyingExam || '—'} (${bg.qualifyingPercentage ? bg.qualifyingPercentage + '%' : '—'})`)],
      ['Favourite Subjects', Array.isArray(bg.favouriteSubjects) ? sanitizePdfText(bg.favouriteSubjects.join(', ')) : '—', 'Difficult Subjects', Array.isArray(bg.difficultSubjects) ? sanitizePdfText(bg.difficultSubjects.join(', ')) : '—'],
      ['Dream Career', sanitizePdfText(asp.dreamCareer || '—'), 'Career Path', sanitizePdfText(asp.path || '—')],
      ['Preferred Companies', Array.isArray(asp.preferredCompanies) ? sanitizePdfText(asp.preferredCompanies.join(', ')) : '—', 'Areas of Interest', Array.isArray(asp.areasOfInterest) ? sanitizePdfText(asp.areasOfInterest.join(', ')) : '—'],
    ],
  });
  y = doc.lastAutoTable.finalY + 4;

  if (skills.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: 'Skill', dataKey: 'skill' },
        { header: 'Rating (1-5)', dataKey: 'rating' },
        { header: 'Mentor Observation', dataKey: 'obs' },
      ],
      body: skills.map((s) => ({
        skill: sanitizePdfText(s.skill || '—'),
        rating: s.rating ? `${s.rating} / 5` : '—',
        obs: sanitizePdfText(s.mentorObservation || '—'),
      })),
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      1: { cellWidth: contentWidth - 38 },
    },
    body: [
      ['Self Assessment Strengths', sanitizePdfText(self.strengths || '—')],
      ['Self Assessment Improvements', sanitizePdfText(self.areasForImprovement || '—')],
      ['Self Assessment Challenges', sanitizePdfText(self.challenges || '—')],
      ['Mentor Academic Assessment', sanitizePdfText(ment.academic || '—')],
      ['Mentor Behaviour Assessment', sanitizePdfText(ment.behaviour || '—')],
      ['Mentor Recommendations', sanitizePdfText(ment.recommendations || '—')],
      ['Assessment Recorded On', sanitizePdfText(ment.recordedOn || '—')],
    ],
  });
  y = doc.lastAutoTable.finalY + 6;

  // SECTION 5 — ACADEMIC PERFORMANCE
  addSectionHeading('Section 5 — Academic Performance & CGPA');
  const perfRows = performance.rows || [];
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      1: { cellWidth: 26 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      3: { cellWidth: 26 },
      4: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      5: { cellWidth: 16 },
    },
    body: [
      ['Current CGPA', String(performance.cgpa ?? '—'), 'Target CGPA', String(performance.cgpaTarget ?? '—'), 'CGPA Gap', String(performance.cgpaGap ?? '—')],
      ['Standing Arrears', String(performance.standingArrears ?? '—'), 'Total Historical Arrears', String(performance.totalArrears ?? '—'), 'GPA Scale', String(performance.gpaScale ?? '10.0')],
    ],
  });
  y = doc.lastAutoTable.finalY + 4;

  if (perfRows.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columns: [
        { header: 'Semester', dataKey: 'sem' },
        { header: 'GPA', dataKey: 'gpa' },
        { header: 'Standing Arrears', dataKey: 'standing' },
        { header: 'New Arrears', dataKey: 'newArr' },
        { header: 'Cleared Arrears', dataKey: 'cleared' },
      ],
      body: perfRows.map((r) => ({
        sem: `Semester ${r.semester}`,
        gpa: r.gpa != null ? String(r.gpa) : '—',
        standing: String(r.standingArrears ?? 0),
        newArr: String(r.newArrears ?? 0),
        cleared: String(r.clearedArrears ?? 0),
      })),
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // SECTION 6 — ATTENDANCE
  addSectionHeading('Section 6 — Attendance Monitoring');
  const attReviews = attendance.reviews || [];
  const shortageSubjects = attendance.shortageSubjects || [];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      1: { cellWidth: 53 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      3: { cellWidth: 53 },
    },
    body: [
      ['Current Headline Attendance', attendance.current != null ? `${attendance.current}%` : '—', 'Requirement Threshold', `${attendance.requirement || 75}%`],
      ['Shortage Status', attendance.current != null && attendance.current < (attendance.requirement || 75) ? 'BELOW REQUIREMENT' : 'Satisfactory', 'Shortage Subjects Count', String(shortageSubjects.length)],
    ],
  });
  y = doc.lastAutoTable.finalY + 4;

  if (attReviews.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: 'Review Date', dataKey: 'date' },
        { header: 'Attendance %', dataKey: 'pct' },
        { header: 'Shortage Status', dataKey: 'shortage' },
        { header: 'Action Taken / Guidance', dataKey: 'action' },
      ],
      body: attReviews.map((r) => ({
        date: sanitizePdfText(r.date || '—'),
        pct: r.percentage != null ? `${r.percentage}%` : '—',
        shortage: sanitizePdfText(r.shortage || '—'),
        action: sanitizePdfText(r.actionTaken || '—'),
      })),
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // SECTION 7 — COURSE / INTERNAL PERFORMANCE
  addSectionHeading('Section 7 — Course Performance & Internal Marks');
  const courses = coursePerformance.rows || [];
  if (courses.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: 'Course Code & Subject', dataKey: 'sub' },
        { header: 'CIA 1', dataKey: 'c1' },
        { header: 'CIA 2', dataKey: 'c2' },
        { header: 'Model', dataKey: 'md' },
        { header: 'Avg Mark', dataKey: 'avg' },
        { header: 'Att %', dataKey: 'att' },
        { header: 'Status', dataKey: 'st' },
      ],
      body: courses.map((c) => ({
        sub: sanitizePdfText(`${c.code || ''} ${c.subject || '—'}`.trim()),
        c1: c.cia1 != null ? String(c.cia1) : '—',
        c2: c.cia2 != null ? String(c.cia2) : '—',
        md: c.model != null ? String(c.model) : '—',
        avg: c.average != null ? String(c.average) : '—',
        att: c.attendance != null ? `${c.attendance}%` : '—',
        st: sanitizePdfText(c.status || '—'),
      })),
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No course performance records available.', margin + 2, y);
    y += 8;
  }

  // SECTION 8 — ARREAR TRACKING
  addSectionHeading('Section 8 — Standing Arrear Tracking');
  const arrearRows = arrears.rows || [];
  if (arrearRows.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: 'Code & Subject', dataKey: 'sub' },
        { header: 'Semester', dataKey: 'sem' },
        { header: 'Status', dataKey: 'st' },
        { header: 'Target Completion', dataKey: 'target' },
        { header: 'Action Plan', dataKey: 'plan' },
      ],
      body: arrearRows.map((a) => ({
        sub: sanitizePdfText(`${a.code || ''} ${a.subject || '—'}`.trim()),
        sem: a.semester ? `Sem ${a.semester}` : '—',
        st: sanitizePdfText(a.status || '—'),
        target: sanitizePdfText(a.targetCompletion || '—'),
        plan: sanitizePdfText(a.actionPlan || '—'),
      })),
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No standing arrears recorded for this student.', margin + 2, y);
    y += 8;
  }

  // SECTION 9 — CO-CURRICULAR & EXTRA-CURRICULAR
  addSectionHeading('Section 9 — Co-Curricular & Extra-Curricular Participation');
  const partHistory = participation.history || [];
  if (partHistory.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: 'Category', dataKey: 'cat' },
        { header: 'Activity / Event', dataKey: 'act' },
        { header: 'Role', dataKey: 'role' },
        { header: 'Achievement', dataKey: 'ach' },
        { header: 'Date', dataKey: 'dt' },
      ],
      body: partHistory.map((p) => ({
        cat: sanitizePdfText(p.category || '—'),
        act: sanitizePdfText(p.activity || '—'),
        role: sanitizePdfText(p.role || '—'),
        ach: sanitizePdfText(p.achievement || '—'),
        dt: sanitizePdfText(p.date || '—'),
      })),
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No participation records logged.', margin + 2, y);
    y += 8;
  }

  // SECTION 10 — CERTIFICATIONS & PLACEMENT READINESS
  addSectionHeading('Section 10 — Certifications & Placement Readiness');
  const certRows = certifications.rows || [];
  const readinessRows = placementReadiness.rows || [];

  if (certRows.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: 'Certification Title', dataKey: 'title' },
        { header: 'Platform', dataKey: 'platform' },
        { header: 'Completion Date', dataKey: 'date' },
      ],
      body: certRows.map((c) => ({
        title: sanitizePdfText(c.certification || '—'),
        platform: sanitizePdfText(c.platform || '—'),
        date: sanitizePdfText(c.completionDate || 'Pending / In Progress'),
      })),
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  if (readinessRows.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: 'Readiness Item', dataKey: 'item' },
        { header: 'Status', dataKey: 'st' },
        { header: 'Mentor / Verification Note', dataKey: 'note' },
      ],
      body: readinessRows.map((r) => ({
        item: sanitizePdfText(r.item || '—'),
        st: sanitizePdfText(r.status || '—'),
        note: sanitizePdfText(r.note || '—'),
      })),
    });
    y = doc.lastAutoTable.finalY + 6;
  } else if (certRows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No certification or placement readiness records logged.', margin + 2, y);
    y += 8;
  }

  // SECTION 11 — INTERNSHIP & PROJECTS
  addSectionHeading('Section 11 — Internship & Project Records');
  const ipRecords = internshipAndProject.records || [];
  const internships = ipRecords.filter((r) => r.type === 'Internship' || Boolean(r.internshipCompany));
  const projects = ipRecords.filter((r) => r.type === 'Project' || Boolean(r.projectTitle));

  // Sub-section 1: Internship Records
  if (y > pageHeight - 30) {
    doc.addPage();
    y = margin;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Internship Records', margin + 2, y);
  y += 4;

  if (internships.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: 'Company', dataKey: 'comp' },
        { header: 'Role', dataKey: 'role' },
        { header: 'Period', dataKey: 'period' },
        { header: 'Faculty Guide', dataKey: 'guide' },
        { header: 'Description', dataKey: 'desc' },
      ],
      body: internships.map((r) => ({
        comp: sanitizePdfText(r.internshipCompany || '—'),
        role: sanitizePdfText(r.internshipRole || '—'),
        period: sanitizePdfText(r.internshipPeriod || '—'),
        guide: sanitizePdfText(r.facultyGuide || '—'),
        desc: sanitizePdfText(r.description || '—'),
      })),
    });
    y = doc.lastAutoTable.finalY + 5;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No internship records.', margin + 2, y);
    y += 7;
  }

  // Sub-section 2: Project Records
  if (y > pageHeight - 30) {
    doc.addPage();
    y = margin;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Project Records', margin + 2, y);
  y += 4;

  if (projects.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: 'Project Title', dataKey: 'title' },
        { header: 'Expected Completion', dataKey: 'comp' },
        { header: 'Faculty Guide', dataKey: 'guide' },
        { header: 'Description', dataKey: 'desc' },
      ],
      body: projects.map((r) => ({
        title: sanitizePdfText(r.projectTitle || '—'),
        comp: sanitizePdfText(r.expectedCompletion || '—'),
        guide: sanitizePdfText(r.facultyGuide || '—'),
        desc: sanitizePdfText(r.projectDescription || r.description || '—'),
      })),
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No project records.', margin + 2, y);
    y += 7;
  }

  // SECTION 12 — WELLBEING REVIEW
  addSectionHeading('Section 12 — Well-being Review');
  const wellbeingRows = wellbeing.rows || [];
  if (wellbeingRows.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: 'Well-being Aspect', dataKey: 'asp' },
        { header: 'Concern Flagged', dataKey: 'flag' },
        { header: 'Mentor Remarks / Action', dataKey: 'rem' },
      ],
      body: wellbeingRows.map((w) => ({
        asp: sanitizePdfText(w.aspect || '—'),
        flag: w.concern ? 'Flagged Concern' : 'No Concern',
        rem: sanitizePdfText(w.remarks || '—'),
      })),
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No well-being review data available.', margin + 2, y);
    y += 8;
  }

  // SECTION 13 — PARENT INTERACTION LOG
  addSectionHeading('Section 13 — Parent Interaction Log');
  const parentRows = parentInteractions.rows || [];
  if (parentRows.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: 'Date', dataKey: 'dt' },
        { header: 'Mode', dataKey: 'mode' },
        { header: 'Topic / Discussion', dataKey: 'disc' },
        { header: 'Action Agreed', dataKey: 'act' },
      ],
      body: parentRows.map((p) => ({
        dt: sanitizePdfText(p.date || '—'),
        mode: sanitizePdfText(p.mode || '—'),
        disc: sanitizePdfText(p.discussion || '—'),
        act: sanitizePdfText(p.action || '—'),
      })),
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No parent interactions recorded.', margin + 2, y);
    y += 8;
  }

  // SECTION 14 — CONDUCTED MEETINGS & ACTION ITEMS
  addSectionHeading('Section 14 — Conducted Mentoring Sessions & Action Items');
  if (meetingRows.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: '#', dataKey: 'num' },
        { header: 'Date', dataKey: 'dt' },
        { header: 'Mode', dataKey: 'mode' },
        { header: 'Category', dataKey: 'cat' },
        { header: 'Signatures', dataKey: 'sig' },
        { header: 'Evidence & Geotag', dataKey: 'ev' },
        { header: 'Topics & Key Guidance', dataKey: 'topics' },
      ],
      body: meetingRows.map((m) => {
        const photoCount = m.photoProofs?.length || 0;
        const hasGeo = Boolean(m.geotag);
        const evText = photoCount > 0 || hasGeo
          ? `${photoCount} photo(s)${hasGeo ? ', Geotag' : ''}`
          : 'None';
        const isSigned = m.signed || (m.mentorSigned && m.studentSigned);
        return {
          num: m.number != null ? `#${m.number}` : '—',
          dt: sanitizePdfText(m.date || '—'),
          mode: sanitizePdfText(m.mode || '—'),
          cat: sanitizePdfText(m.category || '—'),
          sig: isSigned ? 'Signed' : 'Pending',
          ev: evText,
          // FULL TOPIC TEXT WRAPPING (NO TRUNCATION)
          topics: m.topicsDiscussed ? sanitizePdfText(m.topicsDiscussed) : '—',
        };
      }),
    });
    y = doc.lastAutoTable.finalY + 5;

    // Consolidated Meeting Action Items
    const allActions = meetingRows.flatMap((m) =>
      Array.isArray(m.actionItems) ? m.actionItems.map((ai) => ({ ...ai, mtgNum: m.number })) : []
    );

    if (allActions.length > 0) {
      if (y > pageHeight - 35) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text('Meeting Action Items Summary', margin + 2, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        columns: [
          { header: 'Mtg #', dataKey: 'mtg' },
          { header: 'Task Description', dataKey: 'task' },
          { header: 'Responsible', dataKey: 'resp' },
          { header: 'Target Date', dataKey: 'target' },
          { header: 'Status', dataKey: 'st' },
        ],
        body: allActions.map((ai) => ({
          mtg: ai.mtgNum != null ? `#${ai.mtgNum}` : '—',
          task: sanitizePdfText(ai.task || '—'),
          resp: sanitizePdfText(ai.responsible || '—'),
          target: sanitizePdfText(ai.targetDate || '—'),
          st: sanitizePdfText(ai.status || '—'),
        })),
      });
      y = doc.lastAutoTable.finalY + 6;
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No conducted mentoring sessions logged.', margin + 2, y);
    y += 8;
  }

  // SECTION 15 — SMART GOALS
  addSectionHeading('Section 15 — SMART Goals Overview');
  if (Array.isArray(goals) && goals.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: 'Goal Title', dataKey: 'title' },
        { header: 'Target', dataKey: 'target' },
        { header: 'Deadline', dataKey: 'dl' },
        { header: 'Progress %', dataKey: 'prog' },
        { header: 'Status', dataKey: 'st' },
        { header: 'Set By', dataKey: 'by' },
      ],
      body: goals.map((g) => ({
        title: sanitizePdfText(g.text || '—'),
        target: sanitizePdfText(g.target || '—'),
        dl: sanitizePdfText(g.deadline || '—'),
        prog: g.percent != null ? `${g.percent}%` : '—',
        st: sanitizePdfText(g.status || (g.done ? 'Completed' : 'In Progress')),
        by: sanitizePdfText(g.setBy || '—'),
      })),
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No SMART goals recorded.', margin + 2, y);
    y += 8;
  }

  // SECTION 16 — SUPPORT REQUESTS
  addSectionHeading('Section 16 — Student Support Requests');
  const suppRequests = support.requests || [];
  if (suppRequests.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columns: [
        { header: 'Category', dataKey: 'cat' },
        { header: 'Priority', dataKey: 'prio' },
        { header: 'Status', dataKey: 'st' },
        { header: 'Subject / Description', dataKey: 'desc' },
        { header: 'Resolution / Response', dataKey: 'resp' },
      ],
      body: suppRequests.map((r) => {
        const latestComment = Array.isArray(r.comments) && r.comments.length > 0 ? r.comments.filter((c) => c.authorRole === 'mentor').pop()?.message || r.comments[r.comments.length - 1].message : null;
        const responseText = r.response || latestComment || r.reply || '—';
        const reqDesc = r.subject ? (r.details ? `${r.subject} (${r.details})` : r.subject) : (r.description || '—');
        return {
          cat: sanitizePdfText(r.category || '—'),
          prio: sanitizePdfText(r.priority || '—'),
          st: sanitizePdfText(r.status || '—'),
          desc: sanitizePdfText(reqDesc),
          resp: sanitizePdfText(responseText),
        };
      }),
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No support requests logged for this student.', margin + 2, y);
    y += 8;
  }

  // Page Numbers Footer Loop
  const totalPages = doc.internal.getNumberOfPages();
  const generatedTimestamp = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);

    // Footer line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);

    // Left footer
    doc.text(
      sanitizePdfText(`MMRMS - Overall Student Review | ${identity.name || 'Student'} (${identity.rollNumber || ''})`),
      margin,
      pageHeight - 5
    );

    // Center timestamp
    doc.text(generatedTimestamp, pageWidth / 2 - 12, pageHeight - 5);

    // Right footer (Page X of Y)
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 5);
  }

  // Save PDF
  const safeFilename = (identity.name || 'Student')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toLowerCase();
  doc.save(`overall_student_review_${safeFilename}_${identity.rollNumber || 'record'}.pdf`);
}
