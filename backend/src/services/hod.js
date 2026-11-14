import { INSTITUTION } from '../data/seed.js';
import {
  findMenteeById,
  findMentorById,
  listAllMentees,
  listArchivedStaff,
  listCoordinatorEvents,
  listEligibleFaculty,
  listMentees,
  listMentors,
  listOdRequests,
  listUploadHistory,
  listYearCoordinators,
} from '../data/store.js';
import { summariseMentee } from './mentor.js';
import { initials } from './student.js';
import { buildMenteeRecordBook, menteeToStudent } from './mentee.js';

const mean = (values) =>
  values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;

function summaries() {
  return listAllMentees().map(summariseMentee);
}

const REF_DATE = new Date('2026-08-01T00:00:00.000Z');

function parseMeetingDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function getDaysSince(dateStr) {
  const d = parseMeetingDate(dateStr);
  if (!d) return 999;
  const diffTime = Math.max(0, REF_DATE.getTime() - d.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function isMeetingInCurrentCycle(dateStr) {
  if (!dateStr) return false;
  if (typeof dateStr === 'string' && (dateStr.includes('Jul 2026') || dateStr.includes('Aug 2026'))) {
    return true;
  }
  const d = parseMeetingDate(dateStr);
  if (!d) return false;
  return d.getFullYear() === 2026 && (d.getMonth() === 6 || d.getMonth() === 7);
}

/**
 * Analyzes meetings, frequency compliance, and action items for an individual mentee.
 */
export function analyzeMenteeMeetings(rawMentee) {
  const student = menteeToStudent(rawMentee);
  const meetings = student.meetings || [];
  const currentCycleMeetings = meetings.filter((m) => isMeetingInCurrentCycle(m.date));
  const meetingsThisMonth = currentCycleMeetings.length;
  const meetsMonthlyTarget = meetingsThisMonth >= 2;
  const lastMeetingDate = rawMentee.lastMeeting || (meetings[0]?.date ?? null);
  const daysSinceLastMeeting = getDaysSince(lastMeetingDate);

  const latestMeeting = meetings[0] || null;
  const openActionItems = meetings.flatMap((m) =>
    (m.actionItems || [])
      .filter((a) => a.status !== 'Completed')
      .map((a) => ({
        ...a,
        meetingId: m.id,
        meetingNumber: m.number,
        meetingDate: m.date,
        studentId: rawMentee.id,
        studentName: rawMentee.name,
        rollNumber: rawMentee.rollNumber,
        mentorId: rawMentee.mentorId,
      }))
  );

  return {
    student,
    meetings,
    meetingsHeld: rawMentee.meetingsHeld ?? meetings.length,
    meetingsThisMonth,
    meetsMonthlyTarget,
    monthlyDeficit: Math.max(0, 2 - meetingsThisMonth),
    lastMeetingDate,
    daysSinceLastMeeting,
    latestMeetingSummary: latestMeeting
      ? {
          meetingNumber: latestMeeting.number,
          date: latestMeeting.date,
          mode: latestMeeting.mode,
          topicsDiscussed: latestMeeting.topicsDiscussed,
          studentConcerns: latestMeeting.studentConcerns,
          mentorSuggestions: latestMeeting.mentorSuggestions,
          supportRequired: latestMeeting.supportRequired,
          actionItems: latestMeeting.actionItems || [],
        }
      : null,
    openActionItems,
  };
}

/**
 * Discovers and groups all departmental cohorts dynamically from students and configured coordinators.
 */
export function getCohortsSummary() {
  const students = summaries();
  const mentors = listMentors();
  const allCoordinators = listYearCoordinators(true);
  const activeCoordinators = listYearCoordinators(false);

  const cohortMap = new Map();

  const defaultCohorts = [
    { cohortId: '24BCS', cohortName: '2024 BCS', year: 'II Year / 2024–28', prefix: '24' },
    { cohortId: '23BCS', cohortName: '2023 BCS', year: 'III Year / 2023–27', prefix: '23' },
    { cohortId: '22BCS', cohortName: '2022 BCS', year: 'IV Year / 2022–26', prefix: '22' },
    { cohortId: '25BCS', cohortName: '2025 BCS', year: 'I Year / 2025–29', prefix: '25' },
  ];

  for (const c of defaultCohorts) {
    cohortMap.set(c.cohortId, {
      ...c,
      students: [],
    });
  }

  for (const s of students) {
    const roll = String(s.rollNumber || '').toUpperCase();
    const prefix = roll.slice(0, 2);
    const key = `${prefix}BCS`;
    if (!cohortMap.has(key)) {
      cohortMap.set(key, {
        cohortId: key,
        cohortName: s.section || `${prefix} BCS`,
        year: `Batch ${prefix}`,
        prefix,
        students: [],
      });
    }
    cohortMap.get(key).students.push(s);
  }

  return Array.from(cohortMap.values())
    .filter((c) => c.students.length > 0 || c.cohortId === '24BCS')
    .map((c) => {
      const cStudents = c.students;
      const coordinator =
        activeCoordinators.find((yc) => yc.cohortId?.toUpperCase() === c.cohortId?.toUpperCase()) ||
        activeCoordinators[0] ||
        null;
      const previousCoordinators = allCoordinators.filter(
        (yc) => yc.cohortId?.toUpperCase() === c.cohortId?.toUpperCase() && yc.archived
      );

      const distinctMentors = new Set(
        cStudents.map((s) => s.mentorId || s.mentor).filter(Boolean)
      );

      const attendanceShortfalls = cStudents.filter((s) => s.attendanceBelowRequirement).length;
      const atRisk = cStudents.filter(
        (s) => s.health < 70 || s.attendanceBelowRequirement || s.standingArrears > 0
      ).length;

      const totalHeld = cStudents.reduce((sum, s) => sum + (s.meetingsHeld || 0), 0);
      const totalDue = cStudents.reduce((sum, s) => sum + (s.meetingsDue || 0), 0);
      const compliancePct = totalDue ? Math.round((totalHeld / totalDue) * 100) : 0;

      return {
        cohortId: c.cohortId,
        cohortName: c.cohortName,
        year: c.year,
        yearCoordinator: coordinator ? coordinator.name : 'Unassigned',
        coordinatorId: coordinator ? coordinator.id : null,
        coordinatorEmail: coordinator ? coordinator.email : '—',
        coordinatorRoom: coordinator ? coordinator.room : '—',
        coordinatorMobile: coordinator ? coordinator.mobile : '—',
        previousCoordinators: previousCoordinators.map((pc) => ({
          id: pc.id,
          name: pc.name,
          email: pc.email,
          archivedAt: pc.archivedAt,
          archivedReason: pc.archivedReason,
        })),
        totalStudents: cStudents.length,
        totalMentors: distinctMentors.size || (cStudents.length ? mentors.length : 0),
        avgAttendance: mean(cStudents.map((s) => s.attendance)),
        avgCgpa: Number((cStudents.reduce((sum, s) => sum + s.cgpa, 0) / (cStudents.length || 1)).toFixed(2)),
        attendanceShortfalls,
        atRiskCount: atRisk,
        compliancePct,
        totalHeld,
        totalDue,
      };
    })
    .sort((a, b) => b.totalStudents - a.totalStudents);
}

/**
 * Returns all meetings conducted across the entire department.
 */
export function getDepartmentMeetingMinutes() {
  const mentors = listMentors(true);
  const mentorMap = new Map(mentors.map((m) => [m.id, m]));
  const mentees = listAllMentees();
  const allMeetings = [];

  for (const mentee of mentees) {
    const student = menteeToStudent(mentee);
    const mentor =
      mentorMap.get(mentee.mentorId) || {
        name: mentee.mentorName || 'Faculty Mentor',
        staffCode: mentee.staffCode || '—',
      };
    const meetings = student.meetings || [];

    for (const m of meetings) {
      allMeetings.push({
        id: m.id || `${mentee.id}-mtg-${m.number}`,
        meetingNumber: m.number,
        date: m.date,
        mode: m.mode || 'Offline',
        duration: m.duration || '30 min',
        mentorId: mentee.mentorId,
        mentorName: mentor.name,
        mentorStaffCode: mentor.staffCode,
        mentorCabin: mentor.cabin || 'CSE Block',
        studentId: mentee.id,
        studentName: mentee.name,
        rollNumber: mentee.rollNumber || student.identity?.rollNumber || '—',
        cohort: mentee.section || '2024 BCS',
        attendance: mentee.attendance,
        cgpa: mentee.gpa ?? 0,
        topicsDiscussed: m.topicsDiscussed || 'Review completed.',
        studentConcerns: m.studentConcerns || 'None recorded.',
        mentorSuggestions: m.mentorSuggestions || 'Continue academic progress.',
        supportRequired: m.supportRequired || 'None.',
        actionItems: m.actionItems || [],
        actionItemsText:
          (m.actionItems || [])
            .map((a) => `[${a.responsible}] ${a.task} (${a.status})`)
            .join('; ') || 'None',
        mentorSigned: Boolean(m.mentorSigned),
        studentSigned: Boolean(m.studentSigned),
        nextReviewDate: m.nextReviewDate || '—',
      });
    }
  }

  return allMeetings.sort((a, b) => {
    const da = parseMeetingDate(a.date);
    const db = parseMeetingDate(b.date);
    if (!da || !db) return 0;
    return db.getTime() - da.getTime();
  });
}

/**
 * Returns all action items that haven't been closed across the department.
 */
export function getLongPendingActionItems() {
  const allMeetings = getDepartmentMeetingMinutes();
  const openItems = [];

  for (const m of allMeetings) {
    for (const a of m.actionItems || []) {
      if (a.status !== 'Completed') {
        const targetD = parseMeetingDate(a.targetDate);
        const isOverdue = targetD ? targetD < REF_DATE : false;
        const daysOpen = getDaysSince(m.date);

        openItems.push({
          id: a.id || `${m.studentId}-${Math.random()}`,
          task: a.task,
          responsible: a.responsible || 'Student',
          targetDate: a.targetDate || 'Pending review',
          status: a.status || 'Pending',
          meetingDate: m.date,
          meetingNumber: m.meetingNumber,
          meetingTopics: m.topicsDiscussed,
          studentId: m.studentId,
          studentName: m.studentName,
          rollNumber: m.rollNumber,
          cohort: m.cohort,
          mentorId: m.mentorId,
          mentorName: m.mentorName,
          mentorStaffCode: m.mentorStaffCode,
          daysOpen,
          isOverdue,
          priority: isOverdue ? 'High' : a.status === 'In Progress' ? 'Medium' : 'Normal',
        });
      }
    }
  }

  return openItems.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return b.daysOpen - a.daysOpen;
  });
}

/**
 * Returns full department student directory with monthly meeting compliance.
 */
export function getHodAllStudents() {
  const mentees = listAllMentees();
  const mentors = listMentors(true);
  const mentorMap = new Map(mentors.map((m) => [m.id, m]));

  return mentees
    .map((m) => {
      const analysis = analyzeMenteeMeetings(m);
      const summary = summariseMentee(m);
      const mentor =
        mentorMap.get(m.mentorId) || {
          name: m.mentorName || 'Unassigned',
          staffCode: m.staffCode || '—',
        };

      return {
        ...summary,
        mentorName: mentor.name,
        mentorStaffCode: mentor.staffCode,
        meetingsThisMonth: analysis.meetingsThisMonth,
        meetsMonthlyTarget: analysis.meetsMonthlyTarget,
        monthlyDeficit: analysis.monthlyDeficit,
        lastMeetingDate: analysis.lastMeetingDate,
        daysSinceLastMeeting: analysis.daysSinceLastMeeting,
        isDelayed: analysis.daysSinceLastMeeting > 30,
        openActionsCount: analysis.openActionItems.length,
        latestMeetingSummary: analysis.latestMeetingSummary,
      };
    })
    .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
}

/**
 * Builds department-wide executive overview for HOD.
 */
export function buildHodOverview() {
  const students = summaries();
  const mentors = listMentors(false);
  const coordinators = listYearCoordinators(false);
  const cohorts = getCohortsSummary();
  const eligibleFaculty = listEligibleFaculty();
  const archivedStaff = listArchivedStaff();

  const atRiskStudents = students
    .filter((s) => s.health < 70 || s.attendanceBelowRequirement || s.standingArrears > 0)
    .sort((a, b) => a.health - b.health);

  const attendanceShortfalls = students.filter((s) => s.attendanceBelowRequirement);

  // Analyze each mentor with monthly compliance & mentee activity details
  const mentorList = mentors.map((m) => {
    const rawMentees = listMentees(m.id);
    const menteeAnalyses = rawMentees.map((raw) => {
      const analysis = analyzeMenteeMeetings(raw);
      const summary = summariseMentee(raw);
      return {
        ...summary,
        meetingsThisMonth: analysis.meetingsThisMonth,
        meetsMonthlyTarget: analysis.meetsMonthlyTarget,
        monthlyDeficit: analysis.monthlyDeficit,
        lastMeetingDate: analysis.lastMeetingDate,
        daysSinceLastMeeting: analysis.daysSinceLastMeeting,
        openActionsCount: analysis.openActionItems.length,
        recentTopic: analysis.latestMeetingSummary?.topicsDiscussed || 'No meetings conducted',
        recentGuidance: analysis.latestMeetingSummary?.mentorSuggestions || 'No suggestions recorded',
        recentSupport: analysis.latestMeetingSummary?.supportRequired || 'None',
        latestMeetingSummary: analysis.latestMeetingSummary,
      };
    });

    const meetingsHeld = menteeAnalyses.reduce((sum, s) => sum + s.meetingsHeld, 0);
    const meetingsDue = menteeAnalyses.reduce((sum, s) => sum + s.meetingsDue, 0);
    const compliance = meetingsDue ? Math.round((meetingsHeld / meetingsDue) * 100) : 0;

    // Monthly 2-meeting target rule: each mentor must conduct >= 2 meetings for each mentee
    const monthlyTarget = menteeAnalyses.length * 2;
    const monthlyHeld = menteeAnalyses.reduce((sum, s) => sum + s.meetingsThisMonth, 0);
    const menteesBelowTarget = menteeAnalyses.filter((s) => !s.meetsMonthlyTarget).length;
    const meetsMonthlyTarget = menteeAnalyses.length === 0 || menteesBelowTarget === 0;
    const monthlyCompliancePct = menteeAnalyses.length
      ? Math.round(((menteeAnalyses.length - menteesBelowTarget) / menteeAnalyses.length) * 100)
      : 100;

    // Determine mentor's last meeting date across all assigned mentees
    const validDates = menteeAnalyses
      .map((s) => s.lastMeetingDate)
      .filter(Boolean)
      .map(parseMeetingDate)
      .filter(Boolean);
    const mostRecentMeetingDate = validDates.length
      ? new Date(Math.max(...validDates.map((d) => d.getTime()))).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null;
    const daysSinceLastMeeting = getDaysSince(mostRecentMeetingDate);
    const isInactive = menteeAnalyses.length > 0 && (daysSinceLastMeeting > 30 || monthlyHeld === 0);

    const openActionItemsCount = menteeAnalyses.reduce((sum, s) => sum + s.openActionsCount, 0);

    return {
      id: m.id,
      staffCode: m.staffCode,
      name: m.name,
      initials: initials(m.name),
      email: m.email,
      department: m.department,
      cabin: m.cabin,
      assignedMentees: menteeAnalyses.length,
      meetingsHeld,
      meetingsDue,
      compliance,
      monthlyTarget,
      monthlyHeld,
      menteesBelowTarget,
      meetsMonthlyTarget,
      monthlyCompliancePct,
      lastMeetingDate: mostRecentMeetingDate || 'None recorded',
      daysSinceLastMeeting,
      isInactive,
      openActionItemsCount,
      avgAttendance: mean(menteeAnalyses.map((s) => s.attendance)),
      batches: m.batches || ['2024-28 Batch'],
      mentees: menteeAnalyses,
    };
  });

  const totalHeld = mentorList.reduce((sum, m) => sum + m.meetingsHeld, 0);
  const totalDue = mentorList.reduce((sum, m) => sum + m.meetingsDue, 0);
  const deptCompliance = totalDue ? Math.round((totalHeld / totalDue) * 100) : 0;

  // Department Academic & Attendance Overview
  const academicOverview = {
    avgAttendance: mean(students.map((s) => s.attendance)),
    avgCgpa: Number((students.reduce((sum, s) => sum + s.cgpa, 0) / (students.length || 1)).toFixed(2)),
    standingArrearsTotal: students.reduce((sum, s) => sum + (s.standingArrears || 0), 0),
    attendanceShortfallsCount: attendanceShortfalls.length,
    arrearStudentsCount: students.filter((s) => (s.standingArrears || 0) > 0).length,
  };

  // Department-wide Monthly 2-Meeting Compliance Analysis
  const allStudentAnalyses = listAllMentees().map(analyzeMenteeMeetings);
  const studentsMeetingTarget = allStudentAnalyses.filter((s) => s.meetsMonthlyTarget).length;
  const studentsBelowTarget = allStudentAnalyses.filter((s) => !s.meetsMonthlyTarget).length;
  const belowTargetMentors = mentorList.filter((m) => m.menteesBelowTarget > 0);
  const inactiveMentors = mentorList.filter((m) => m.isInactive);

  const monthlyCompliance = {
    targetPerMentee: 2,
    totalStudents: allStudentAnalyses.length,
    studentsMeetingTarget,
    studentsBelowTarget,
    studentCompliancePct: allStudentAnalyses.length
      ? Math.round((studentsMeetingTarget / allStudentAnalyses.length) * 100)
      : 100,
    totalMentors: mentorList.length,
    compliantMentorsCount: mentorList.filter((m) => m.meetsMonthlyTarget).length,
    belowTargetMentorsCount: belowTargetMentors.length,
    inactiveMentorsCount: inactiveMentors.length,
  };

  const allMeetingMinutes = getDepartmentMeetingMinutes();
  const longPendingActionItems = getLongPendingActionItems();
  const allStudents = getHodAllStudents();

  const uploadHistory = listUploadHistory();
  const events = listCoordinatorEvents();
  const odRequests = listOdRequests();

  return {
    institution: INSTITUTION,
    department: 'Computer Science and Engineering',
    hod: {
      name: 'Dr. HOD CSE',
      designation: 'Professor & Head of Department',
      email: 'hod.cse@kct.ac.in',
      initials: 'HOD',
      cabin: 'CSE Department · Office of the HOD',
    },
    stats: {
      totalCohorts: cohorts.length,
      totalStudents: students.length,
      totalMentors: mentors.length,
      totalCoordinators: coordinators.length,
      avgAttendance: academicOverview.avgAttendance,
      avgCgpa: academicOverview.avgCgpa,
      standingArrearsTotal: academicOverview.standingArrearsTotal,
      attendanceShortfalls: attendanceShortfalls.length,
      compliancePct: deptCompliance,
      totalMeetingsHeld: totalHeld,
      totalMeetingsDue: totalDue,
      pendingOd: odRequests.filter((r) => r.status === 'Pending').length,
      monthlyCompliancePct: monthlyCompliance.studentCompliancePct,
      belowTargetMentorsCount: belowTargetMentors.length,
      inactiveMentorsCount: inactiveMentors.length,
      openActionItemsCount: longPendingActionItems.length,
    },
    academicOverview,
    allStudents,
    monthlyCompliance,
    inactiveMentors,
    belowTargetMentors,
    longPendingActionItems,
    allMeetingMinutes,
    cohorts,
    mentors: mentorList,
    atRisk: atRiskStudents.slice(0, 25),
    coordinators: coordinators.map((yc) => ({
      ...yc,
      initials: initials(yc.name),
    })),
    eligibleFaculty,
    archivedStaff,
    recentUploads: uploadHistory.slice(0, 5),
    recentEvents: events.slice(0, 5),
  };
}

/**
 * Returns mentor list with mentee breakdown for HOD.
 */
export function getHodMentors(includeArchived = false) {
  const mentors = listMentors(includeArchived);
  return mentors.map((m) => {
    const rawMentees = listMentees(m.id);
    const menteeAnalyses = rawMentees.map((raw) => {
      const analysis = analyzeMenteeMeetings(raw);
      const summary = summariseMentee(raw);
      return {
        ...summary,
        meetingsThisMonth: analysis.meetingsThisMonth,
        meetsMonthlyTarget: analysis.meetsMonthlyTarget,
        monthlyDeficit: analysis.monthlyDeficit,
        lastMeetingDate: analysis.lastMeetingDate,
        daysSinceLastMeeting: analysis.daysSinceLastMeeting,
        openActionsCount: analysis.openActionItems.length,
        recentTopic: analysis.latestMeetingSummary?.topicsDiscussed || 'No meetings conducted',
        recentGuidance: analysis.latestMeetingSummary?.mentorSuggestions || 'No suggestions recorded',
        recentSupport: analysis.latestMeetingSummary?.supportRequired || 'None',
        latestMeetingSummary: analysis.latestMeetingSummary,
      };
    });

    const meetingsHeld = menteeAnalyses.reduce((sum, s) => sum + s.meetingsHeld, 0);
    const meetingsDue = menteeAnalyses.reduce((sum, s) => sum + s.meetingsDue, 0);
    const compliance = meetingsDue ? Math.round((meetingsHeld / meetingsDue) * 100) : 0;

    const monthlyTarget = menteeAnalyses.length * 2;
    const monthlyHeld = menteeAnalyses.reduce((sum, s) => sum + s.meetingsThisMonth, 0);
    const menteesBelowTarget = menteeAnalyses.filter((s) => !s.meetsMonthlyTarget).length;
    const meetsMonthlyTarget = menteeAnalyses.length === 0 || menteesBelowTarget === 0;

    const validDates = menteeAnalyses
      .map((s) => s.lastMeetingDate)
      .filter(Boolean)
      .map(parseMeetingDate)
      .filter(Boolean);
    const mostRecentMeetingDate = validDates.length
      ? new Date(Math.max(...validDates.map((d) => d.getTime()))).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null;
    const daysSinceLastMeeting = getDaysSince(mostRecentMeetingDate);
    const isInactive = menteeAnalyses.length > 0 && (daysSinceLastMeeting > 30 || monthlyHeld === 0);

    return {
      id: m.id,
      staffCode: m.staffCode,
      name: m.name,
      initials: initials(m.name),
      email: m.email,
      department: m.department,
      cabin: m.cabin,
      status: m.status || (m.archived ? 'Archived' : 'Active'),
      archived: Boolean(m.archived),
      archivedAt: m.archivedAt || null,
      archivedReason: m.archivedReason || null,
      assignedMentees: menteeAnalyses.length,
      meetingsHeld,
      meetingsDue,
      compliance,
      monthlyTarget,
      monthlyHeld,
      menteesBelowTarget,
      meetsMonthlyTarget,
      lastMeetingDate: mostRecentMeetingDate || 'None recorded',
      daysSinceLastMeeting,
      isInactive,
      openActionItemsCount: menteeAnalyses.reduce((sum, s) => sum + s.openActionsCount, 0),
      avgAttendance: mean(menteeAnalyses.map((s) => s.attendance)),
      mentees: menteeAnalyses,
    };
  });
}

/**
 * Returns detailed mentor info + assigned mentees for HOD.
 */
export function getHodMentorDetail(mentorId) {
  const mentor = findMentorById(mentorId);
  if (!mentor) return null;
  const rawMentees = listMentees(mentorId);
  const menteeAnalyses = rawMentees.map((raw) => {
    const analysis = analyzeMenteeMeetings(raw);
    const summary = summariseMentee(raw);
    return {
      ...summary,
      meetingsThisMonth: analysis.meetingsThisMonth,
      meetsMonthlyTarget: analysis.meetsMonthlyTarget,
      monthlyDeficit: analysis.monthlyDeficit,
      lastMeetingDate: analysis.lastMeetingDate,
      daysSinceLastMeeting: analysis.daysSinceLastMeeting,
      openActionsCount: analysis.openActionItems.length,
      recentTopic: analysis.latestMeetingSummary?.topicsDiscussed || 'No meetings conducted',
      recentGuidance: analysis.latestMeetingSummary?.mentorSuggestions || 'No suggestions recorded',
      recentSupport: analysis.latestMeetingSummary?.supportRequired || 'None',
      latestMeetingSummary: analysis.latestMeetingSummary,
    };
  });

  const meetingsHeld = menteeAnalyses.reduce((sum, s) => sum + s.meetingsHeld, 0);
  const meetingsDue = menteeAnalyses.reduce((sum, s) => sum + s.meetingsDue, 0);
  const compliance = meetingsDue ? Math.round((meetingsHeld / meetingsDue) * 100) : 0;
  const monthlyHeld = menteeAnalyses.reduce((sum, s) => sum + s.meetingsThisMonth, 0);
  const menteesBelowTarget = menteeAnalyses.filter((s) => !s.meetsMonthlyTarget).length;

  const validDates = menteeAnalyses
    .map((s) => s.lastMeetingDate)
    .filter(Boolean)
    .map(parseMeetingDate)
    .filter(Boolean);
  const mostRecentMeetingDate = validDates.length
    ? new Date(Math.max(...validDates.map((d) => d.getTime()))).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;
  const daysSinceLastMeeting = getDaysSince(mostRecentMeetingDate);

  return {
    mentor: {
      ...mentor,
      initials: initials(mentor.name),
      lastMeetingDate: mostRecentMeetingDate || 'None recorded',
      daysSinceLastMeeting,
      isInactive: menteeAnalyses.length > 0 && (daysSinceLastMeeting > 30 || monthlyHeld === 0),
    },
    stats: {
      assignedCount: menteeAnalyses.length,
      meetingsHeld,
      meetingsDue,
      compliance,
      monthlyTarget: menteeAnalyses.length * 2,
      monthlyHeld,
      menteesBelowTarget,
      meetsMonthlyTarget: menteeAnalyses.length === 0 || menteesBelowTarget === 0,
      avgAttendance: mean(menteeAnalyses.map((s) => s.attendance)),
      attendanceShortfalls: menteeAnalyses.filter((s) => s.attendance < 75).length,
      openActionItemsCount: menteeAnalyses.reduce((sum, s) => sum + s.openActionsCount, 0),
    },
    mentees: menteeAnalyses,
  };
}

/**
 * Returns all at-risk students across the department.
 */
export function getHodAtRiskStudents() {
  const students = summaries();
  const mentors = listMentors();
  const mentorMap = new Map(mentors.map((m) => [m.id, m.name]));

  return students
    .filter((s) => s.health < 70 || s.attendanceBelowRequirement || s.standingArrears > 0)
    .map((s) => ({
      ...s,
      mentorName: mentorMap.get(s.mentorId) || s.mentor || '—',
    }))
    .sort((a, b) => a.health - b.health);
}

/**
 * Returns compliance matrix across all mentors.
 */
export function getHodComplianceMatrix() {
  const mentors = listMentors();
  const weeks = ['W1 (Jul 1-7)', 'W2 (Jul 8-14)', 'W3 (Jul 15-21)', 'W4 (Jul 22-28)', 'W5 (Jul 29-Aug 4)'];

  const rows = mentors.map((m) => {
    const rawMentees = listMentees(m.id);
    const assigned = rawMentees.map(summariseMentee);
    const meetingsHeld = assigned.reduce((sum, s) => sum + s.meetingsHeld, 0);
    const meetingsDue = assigned.reduce((sum, s) => sum + s.meetingsDue, 0);
    const compliance = meetingsDue ? Math.round((meetingsHeld / meetingsDue) * 100) : 0;

    const weeklyStatus = weeks.map((w, wIdx) => {
      if (wIdx < 3)
        return {
          week: w,
          status: 'Completed',
          conducted: Math.min(assigned.length, Math.ceil(assigned.length / 2)),
        };
      if (wIdx === 3)
        return {
          week: w,
          status: compliance >= 80 ? 'Completed' : 'Partial',
          conducted: Math.ceil(assigned.length / 3),
        };
      return { week: w, status: 'Pending', conducted: 0 };
    });

    return {
      mentorId: m.id,
      staffCode: m.staffCode,
      name: m.name,
      assignedCount: assigned.length,
      meetingsHeld,
      meetingsDue,
      compliance,
      weeklyStatus,
    };
  });

  return {
    weeks,
    mentors: rows,
  };
}
