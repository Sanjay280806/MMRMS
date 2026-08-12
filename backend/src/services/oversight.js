import { ATTENDANCE_REQUIREMENT, INSTITUTION, MENTORS } from '../data/seed.js';
import {
  listAllMentees,
  listClassMeetings,
  listCoordinatorEvents,
  listGrievances,
  listOdRequests,
} from '../data/store.js';
import { healthIndex } from './health.js';
import { summariseMentee } from './mentor.js';
import { initials } from './student.js';

const mean = (values) =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

const toneForAttendance = (attendance) =>
  attendance < ATTENDANCE_REQUIREMENT ? 'rose' : attendance < 80 ? 'amber' : 'green';

function summaries() {
  return listAllMentees().map(summariseMentee);
}

function studentLookup(rows) {
  return new Map(rows.map((student) => [student.id, student]));
}

function grievanceRows(students) {
  const byId = studentLookup(students);
  return listGrievances().map((grievance) => {
    const student = byId.get(grievance.studentId);
    return {
      ...grievance,
      student: student?.name ?? 'Student not found',
      rollNumber: student?.rollNumber ?? '—',
      initials: student ? initials(student.name) : '—',
    };
  });
}

/** Applies query filtering and pagination to a role-scoped student directory. */
export function buildStudentDirectory(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const search = String(query.student ?? query.search ?? '').trim().toLowerCase();
  const className = String(query.class ?? '').trim().toLowerCase();
  const year = String(query.year ?? '').trim();

  const filtered = summaries()
    .filter((student) => !search || `${student.name} ${student.rollNumber}`.toLowerCase().includes(search))
    .filter((student) => !className || student.section.toLowerCase() === className)
    .filter((student) => !year || String(student.year) === year || student.meta.includes(year))
    .sort((a, b) => a.name.localeCompare(b.name));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  return {
    total,
    page: safePage,
    limit,
    totalPages,
    students: filtered.slice(start, start + limit),
  };
}

function mentorTracker(students) {
  return MENTORS.map((mentor) => {
    const assigned = students.filter((student) => student.id && listAllMentees().find((raw) => raw.id === student.id)?.mentorId === mentor.id);
    const meetingsHeld = assigned.reduce((sum, student) => sum + student.meetingsHeld, 0);
    const meetingsDue = assigned.reduce((sum, student) => sum + student.meetingsDue, 0);
    const compliance = meetingsDue ? Math.round((meetingsHeld / meetingsDue) * 100) : 0;
    return {
      id: mentor.id,
      staffCode: mentor.staffCode,
      name: mentor.name,
      initials: initials(mentor.name),
      assigned: assigned.length,
      meetingsHeld,
      meetingsDue,
      compliance,
      atRisk: assigned.filter((student) => student.health < 70).length,
      averageHealth: mean(assigned.map((student) => student.health)),
    };
  });
}

export function buildAdvisorOverview(advisor) {
  const students = summaries();
  const grievances = grievanceRows(students);
  const attendanceShortfalls = students.filter((student) => student.attendanceBelowRequirement);
  const academicConcerns = students.filter((student) => student.cgpa < 7 || student.standingArrears > 0);
  const attention = students
    .filter((student) => student.health < 70 || student.attendanceBelowRequirement || student.standingArrears > 0)
    .sort((a, b) => a.health - b.health);

  return {
    institution: INSTITUTION,
    advisor: { ...advisor, initials: initials(advisor.name) },
    stats: {
      enrolled: students.length,
      averageAttendance: mean(students.map((student) => student.attendance)),
      attendanceShortfalls: attendanceShortfalls.length,
      academicConcerns: academicConcerns.length,
      openGrievances: grievances.filter((item) => !['Resolved', 'Closed'].includes(item.status)).length,
      meetingsScheduled: listClassMeetings().filter((meeting) => meeting.status !== 'Completed').length,
      disciplineIncidents: 0,
    },
    attendanceWatch: attendanceShortfalls.sort((a, b) => a.attendance - b.attendance),
    academicWatch: academicConcerns.sort((a, b) => a.cgpa - b.cgpa),
    attention,
    classMeetings: listClassMeetings(),
    grievances,
    discipline: [],
    mentorTracker: mentorTracker(students),
  };
}

export function buildCoordinatorOverview(coordinator) {
  const students = summaries();
  const mentors = mentorTracker(students);
  const attendanceShortfalls = students.filter((student) => student.attendanceBelowRequirement);
  const atRisk = students.filter((student) => student.health < 70);
  const events = listCoordinatorEvents();
  const odRequests = listOdRequests();
  const totalDue = mentors.reduce((sum, mentor) => sum + mentor.meetingsDue, 0);
  const totalHeld = mentors.reduce((sum, mentor) => sum + mentor.meetingsHeld, 0);

  return {
    institution: INSTITUTION,
    coordinator: { ...coordinator, initials: initials(coordinator.name) },
    stats: {
      students: students.length,
      mentors: mentors.length,
      averageAttendance: mean(students.map((student) => student.attendance)),
      atRisk: atRisk.length,
      mentorCompliance: totalDue ? Math.round((totalHeld / totalDue) * 100) : 0,
      pendingOd: odRequests.filter((request) => request.status === 'Pending').length,
      plannedEvents: events.filter((event) => event.status !== 'Completed').length,
    },
    mentors,
    atRisk: atRisk.sort((a, b) => a.health - b.health),
    attendanceWatch: attendanceShortfalls.sort((a, b) => a.attendance - b.attendance),
    events,
    odRequests: odRequests.map((request) => {
      const student = students.find((item) => item.id === request.studentId);
      return { ...request, student: student?.name ?? 'Student not found', rollNumber: student?.rollNumber ?? '—' };
    }),
    academicTracker: {
      averageCgpa: Number((students.reduce((sum, student) => sum + student.cgpa, 0) / (students.length || 1)).toFixed(1)),
      attendanceShortfalls: attendanceShortfalls.length,
      standingArrears: students.reduce((sum, student) => sum + student.standingArrears, 0),
      certificationsInProgress: students.filter((student) => student.readinessDone >= 3).length,
    },
    audit: [
      { label: 'Student master dataset', value: `${students.length}/${students.length}`, tone: 'green' },
      { label: 'Mentoring tracker', value: `${totalHeld}/${totalDue} meetings`, tone: totalHeld >= totalDue * 0.8 ? 'green' : 'amber' },
      { label: 'Attendance follow-up list', value: `${attendanceShortfalls.length} students`, tone: attendanceShortfalls.length ? 'amber' : 'green' },
      { label: 'Open OD approvals', value: `${odRequests.filter((request) => request.status === 'Pending').length} requests`, tone: odRequests.some((request) => request.status === 'Pending') ? 'amber' : 'green' },
    ],
  };
}

export function decorateStudentForOversight(student) {
  return {
    ...student,
    attendanceTone: toneForAttendance(student.attendance),
    riskScore: 100 - student.health,
    overallIndex: healthIndex(student.dimensions),
  };
}
