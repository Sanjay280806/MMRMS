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
import { buildMenteeRecordBook } from './mentee.js';

const mean = (values) =>
  values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;

function summaries() {
  return listAllMentees().map(summariseMentee);
}

/**
 * Discovers and groups all departmental cohorts dynamically from students and configured coordinators.
 */
export function getCohortsSummary() {
  const students = summaries();
  const mentors = listMentors();
  const allCoordinators = listYearCoordinators(true);
  const activeCoordinators = listYearCoordinators(false);

  // Map known cohorts or extract from student roll numbers / sections
  const cohortMap = new Map();

  // Seed known active cohorts
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

  // Assign students into cohorts
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
      const coordinator = activeCoordinators.find((yc) => yc.cohortId?.toUpperCase() === c.cohortId?.toUpperCase()) || activeCoordinators[0] || null;
      const previousCoordinators = allCoordinators.filter((yc) => yc.cohortId?.toUpperCase() === c.cohortId?.toUpperCase() && yc.archived);

      const distinctMentors = new Set(
        cStudents.map((s) => s.mentorId || s.mentor).filter(Boolean)
      );

      const attendanceShortfalls = cStudents.filter((s) => s.attendanceBelowRequirement).length;
      const atRisk = cStudents.filter((s) => s.health < 70 || s.attendanceBelowRequirement || s.standingArrears > 0).length;

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
 * Builds department-wide executive overview for HOD.
 */
export function buildHodOverview() {
  const students = summaries();
  const mentors = listMentors(false);
  const allMentors = listMentors(true);
  const coordinators = listYearCoordinators(false);
  const cohorts = getCohortsSummary();
  const eligibleFaculty = listEligibleFaculty();
  const archivedStaff = listArchivedStaff();

  const atRiskStudents = students
    .filter((s) => s.health < 70 || s.attendanceBelowRequirement || s.standingArrears > 0)
    .sort((a, b) => a.health - b.health);

  const attendanceShortfalls = students.filter((s) => s.attendanceBelowRequirement);

  // Department-wide mentor metrics
  const mentorList = mentors.map((m) => {
    const rawMentees = listMentees(m.id);
    const assigned = rawMentees.map(summariseMentee);
    const meetingsHeld = assigned.reduce((sum, s) => sum + s.meetingsHeld, 0);
    const meetingsDue = assigned.reduce((sum, s) => sum + s.meetingsDue, 0);
    const compliance = meetingsDue ? Math.round((meetingsHeld / meetingsDue) * 100) : 0;
    return {
      id: m.id,
      staffCode: m.staffCode,
      name: m.name,
      initials: initials(m.name),
      email: m.email,
      department: m.department,
      cabin: m.cabin,
      assignedMentees: assigned.length,
      meetingsHeld,
      meetingsDue,
      compliance,
      atRiskMentees: assigned.filter((s) => s.health < 70).length,
      averageHealth: mean(assigned.map((s) => s.health)),
      batches: m.batches || ['2024-28 Batch'],
    };
  });

  const totalHeld = mentorList.reduce((sum, m) => sum + m.meetingsHeld, 0);
  const totalDue = mentorList.reduce((sum, m) => sum + m.meetingsDue, 0);
  const deptCompliance = totalDue ? Math.round((totalHeld / totalDue) * 100) : 0;

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
      avgHealth: mean(students.map((s) => s.health)),
      avgAttendance: mean(students.map((s) => s.attendance)),
      avgCgpa: Number((students.reduce((sum, s) => sum + s.cgpa, 0) / (students.length || 1)).toFixed(2)),
      atRiskCount: atRiskStudents.length,
      attendanceShortfalls: attendanceShortfalls.length,
      compliancePct: deptCompliance,
      totalMeetingsHeld: totalHeld,
      totalMeetingsDue: totalDue,
      pendingOd: odRequests.filter((r) => r.status === 'Pending').length,
    },
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
    const assigned = rawMentees.map(summariseMentee);
    const meetingsHeld = assigned.reduce((sum, s) => sum + s.meetingsHeld, 0);
    const meetingsDue = assigned.reduce((sum, s) => sum + s.meetingsDue, 0);
    const compliance = meetingsDue ? Math.round((meetingsHeld / meetingsDue) * 100) : 0;
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
      assignedMentees: assigned.length,
      meetingsHeld,
      meetingsDue,
      compliance,
      atRiskMentees: assigned.filter((s) => s.health < 70).length,
      averageHealth: mean(assigned.map((s) => s.health)),
      mentees: assigned,
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
  const mentees = rawMentees.map(summariseMentee);
  const meetingsHeld = mentees.reduce((sum, s) => sum + s.meetingsHeld, 0);
  const meetingsDue = mentees.reduce((sum, s) => sum + s.meetingsDue, 0);
  const compliance = meetingsDue ? Math.round((meetingsHeld / meetingsDue) * 100) : 0;

  return {
    mentor: {
      ...mentor,
      initials: initials(mentor.name),
    },
    stats: {
      assignedCount: mentees.length,
      meetingsHeld,
      meetingsDue,
      compliance,
      averageHealth: mean(mentees.map((s) => s.health)),
      atRiskCount: mentees.filter((s) => s.health < 70).length,
    },
    mentees,
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

  const rows = mentors.map((m, idx) => {
    const rawMentees = listMentees(m.id);
    const assigned = rawMentees.map(summariseMentee);
    const meetingsHeld = assigned.reduce((sum, s) => sum + s.meetingsHeld, 0);
    const meetingsDue = assigned.reduce((sum, s) => sum + s.meetingsDue, 0);
    const compliance = meetingsDue ? Math.round((meetingsHeld / meetingsDue) * 100) : 0;

    // Simulated weekly compliance flags for visual matrix
    const weeklyStatus = weeks.map((w, wIdx) => {
      if (wIdx < 3) return { week: w, status: 'Completed', conducted: Math.min(assigned.length, Math.ceil(assigned.length / 2)) };
      if (wIdx === 3) return { week: w, status: compliance >= 80 ? 'Completed' : 'Partial', conducted: Math.ceil(assigned.length / 3) };
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
