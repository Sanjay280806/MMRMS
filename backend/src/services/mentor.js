import {
  ATTENDANCE_REQUIREMENT,
  INSTITUTION,
  READINESS_ITEMS,
  SEMESTER_START_DATE,
} from '../data/seed.js';
import { dimensionList, healthIndex, scoreTone } from './health.js';
import { computeDimensions, decorateGoals, formatBatch, initials, standingArrearCount } from './student.js';
import { menteeToStudent } from './mentee.js';
import { listMentees } from '../data/store.js';

const FLAG_TONE = {
  'Low Attendance': 'amber',
  'Attendance Shortage': 'amber',
  'Overdue Meeting': 'rose',
  'Well-being Concern': 'rose',
  'Standing Arrear': 'indigo',
};

function initialInteractionOverdue(mentee, today = new Date()) {
  const deadline = new Date(`${SEMESTER_START_DATE}T00:00:00`);
  deadline.setMonth(deadline.getMonth() + 1);
  return today >= deadline && (mentee.meetingsHeld ?? 0) === 0;
}

/**
 * A mentee reduced to what a roster row or card needs. Everything numeric
 * comes from the same record-book derivation the detail page uses.
 */
export function summariseMentee(mentee) {
  const student = menteeToStudent(mentee);
  const { _performance, ...dims } = computeDimensions(student);
  const index = healthIndex(dims);

  const shortageSubjects = student.coursePerformance.filter(
    (c) => c.attendance < ATTENDANCE_REQUIREMENT,
  );
  const openActions = (student.meetings ?? [])
    .flatMap((m) => m.actionItems ?? [])
    .filter((a) => a.status !== 'Completed');

  return {
    id: mentee.id,
    name: mentee.name,
    initials: initials(mentee.name),
    meta: `CSE · ${student.identity.year} · ${mentee.section}`,
    year: mentee.year,
    section: mentee.section,
    rollNumber: student.identity.rollNumber,
    batch: formatBatch(student.identity.batch),

    health: index,
    healthTone: scoreTone(index),
    dimensions: dims,

    cgpa: Number(
      (student.performance.reduce((s, p) => s + p.gpa, 0) / (student.performance.length || 1)).toFixed(1),
    ),
    attendance: mentee.attendance,
    attendanceBelowRequirement: mentee.attendance < ATTENDANCE_REQUIREMENT,
    shortageCount: shortageSubjects.length,
    standingArrears: standingArrearCount(student.arrears),
    wellbeingConcerns: student.wellbeing.filter((w) => w.concern).length,
    readinessDone: student.placementReadiness.filter((r) => r.status === 'Completed').length,
    readinessTotal: READINESS_ITEMS.length,
    openActionItems: openActions.length,

    meetingsHeld: mentee.meetingsHeld,
    meetingsDue: mentee.meetingsDue,
    meetingsOverdue: Math.max(0, mentee.meetingsDue - mentee.meetingsHeld),
    lastMeeting: mentee.lastMeeting,

    flagReason: mentee.flagReason ?? null,
    flagTone: mentee.flagReason ? FLAG_TONE[mentee.flagReason] ?? 'slate' : null,
    suggestedAction: mentee.suggestedAction ?? null,
    initialInteractionOverdue: initialInteractionOverdue(mentee),
  };
}

export function buildMentorOverview(mentor) {
  const mentees = listMentees(mentor.id).map(summariseMentee);
  const flagged = mentees.filter((m) => m.flagReason).sort((a, b) => a.health - b.health);
  const meetingsHeld = mentees.reduce((sum, mentee) => sum + mentee.meetingsHeld, 0);
  const meetingsPlanned = mentees.reduce((sum, mentee) => sum + mentee.meetingsDue, 0);
  const compliance = Math.round((meetingsHeld / (meetingsPlanned || 1)) * 100);
  const averageHealth = Math.round(
    mentees.reduce((s, m) => s + m.health, 0) / (mentees.length || 1),
  );
  const parentContactsThisTerm = buildParentLog(mentor).length;
  const initialInteractionAlerts = mentees.filter((mentee) => mentee.initialInteractionOverdue);

  // Cohort radar: the mean of each dimension across the roster.
  const cohort = {};
  for (const key of ['academic', 'attendance', 'interaction', 'career', 'wellbeing']) {
    cohort[key] = Math.round(
      mentees.reduce((s, m) => s + m.dimensions[key], 0) / (mentees.length || 1),
    );
  }

  return {
    institution: INSTITUTION,

    mentor: {
      id: mentor.id,
      name: mentor.name,
      email: mentor.email,
      mobile: mentor.mobile,
      department: mentor.department,
      designation: mentor.designation,
      cabin: mentor.cabin,
      batches: mentor.batches,
      yearCoordinator: mentor.yearCoordinator,
      initials: initials(mentor.name),
    },

    stats: {
      assignedMentees: mentees.length,
      batchCount: new Set(mentees.map((mentee) => mentee.year)).size,
      reviewCycle: 'Fortnightly',
      compliance,
      meetingsHeld,
      meetingsPlanned,
      overdueMeetings: mentees.reduce((s, m) => s + m.meetingsOverdue, 0),
      averageHealth,
      flaggedCount: flagged.length,
      attendanceShortfalls: mentees.filter((m) => m.attendanceBelowRequirement).length,
      standingArrears: mentees.reduce((s, m) => s + m.standingArrears, 0),
      wellbeingConcerns: mentees.filter((m) => m.wellbeingConcerns > 0).length,
      openActionItems: mentees.reduce((s, m) => s + m.openActionItems, 0),
      parentContactsThisTerm,
      recordBooksComplete: mentees.filter((mentee) => mentee.meetingsHeld > 0).length,
      recordBooksTotal: mentees.length,
      initialInteractionsOverdue: initialInteractionAlerts.length,
    },

    attention: flagged,
    initialInteractionAlerts,
    cohortHealth: { dimensions: dimensionList(cohort), overall: healthIndex(cohort) },

    /* Section 3 across the roster. */
    attendanceWatch: mentees
      .filter((m) => m.attendanceBelowRequirement)
      .sort((a, b) => a.attendance - b.attendance),

    /* Section 5 across the roster. */
    arrearWatch: mentees.filter((m) => m.standingArrears > 0).sort((a, b) => b.standingArrears - a.standingArrears),

    /* Section 10 across the roster. */
    wellbeingWatch: mentees
      .filter((m) => m.wellbeingConcerns > 0)
      .sort((a, b) => b.wellbeingConcerns - a.wellbeingConcerns),

    /* Section 12 across the roster. */
    meetingWatch: mentees
      .filter((m) => m.meetingsOverdue > 0)
      .sort((a, b) => b.meetingsOverdue - a.meetingsOverdue),

    timeline: mentorTimeline(mentor),
  };
}

/** Section 12 across the roster — every open action item, by student. */
export function buildActionItemQueue(mentor) {
  return listMentees(mentor.id).flatMap((mentee) => {
    const student = menteeToStudent(mentee);
    return student.meetings
      .flatMap((m) => (m.actionItems ?? []).map((a) => ({ ...a, meetingNumber: m.number, meetingDate: m.date })))
      .filter((a) => a.status !== 'Completed')
      .map((a) => ({
        ...a,
        studentId: mentee.id,
        student: mentee.name,
        initials: initials(mentee.name),
        tone: a.status === 'In Progress' ? 'indigo' : 'amber',
      }));
  });
}

/** SMART goals across the roster — Section 12's goal-progress view. */
export function buildGoalOverview(mentor) {
  const items = listMentees(mentor.id).flatMap((mentee) => {
    const student = menteeToStudent(mentee);
    return decorateGoals(student.goals).map((g) => ({
      ...g,
      studentId: mentee.id,
      student: mentee.name,
      initials: initials(mentee.name),
    }));
  });

  const counts = items.reduce((acc, g) => {
    acc[g.status] = (acc[g.status] ?? 0) + 1;
    return acc;
  }, {});

  const tone = { 'On Track': 'indigo', Completed: 'green', 'At Risk': 'amber' };
  const summary = ['On Track', 'Completed', 'At Risk']
    .filter((name) => counts[name])
    .map((name) => ({ name, count: counts[name], tone: tone[name] }));

  const awaiting = items.filter((g) => g.needsAcknowledgement).length;

  return { total: items.length, summary, items, awaitingAcknowledgement: awaiting };
}

/** Section 11 across the roster. */
export function buildParentLog(mentor) {
  return listMentees(mentor.id).flatMap((mentee) => {
    const student = menteeToStudent(mentee);
    return (student.parentInteractions ?? []).map((p) => ({
      ...p,
      studentId: mentee.id,
      student: mentee.name,
      initials: initials(mentee.name),
    }));
  });
}

/** Term report tiles, computed from the live roster. */
export function buildReports(mentor) {
  const mentees = listMentees(mentor.id).map(summariseMentee);
  const meetingsHeld = mentees.reduce((sum, mentee) => sum + mentee.meetingsHeld, 0);
  const meetingsPlanned = mentees.reduce((sum, mentee) => sum + mentee.meetingsDue, 0);
  const compliance = Math.round((meetingsHeld / (meetingsPlanned || 1)) * 100);
  const average = Math.round(mentees.reduce((s, m) => s + m.health, 0) / (mentees.length || 1));

  return [
    { key: 'Meeting Compliance', value: `${compliance}%`, tone: compliance >= 80 ? 'green' : 'amber', note: `${meetingsHeld} of ${meetingsPlanned} meetings recorded` },
    { key: 'Average Health Index', value: String(average), tone: 'ink', note: `Across ${mentees.length} tracked mentees` },
    { key: 'Students Flagged', value: String(mentees.filter((m) => m.health < 70).length), tone: 'rose', note: 'Below the 70 health threshold' },
    { key: 'Attendance Shortfalls', value: String(mentees.filter((m) => m.attendanceBelowRequirement).length), tone: 'amber', note: `Below the ${ATTENDANCE_REQUIREMENT}% requirement` },
    { key: 'Standing Arrears', value: String(mentees.reduce((s, m) => s + m.standingArrears, 0)), tone: 'indigo', note: 'Across the roster, Section 5' },
    { key: 'Well-being Concerns', value: String(mentees.filter((m) => m.wellbeingConcerns > 0).length), tone: 'amber', note: 'Students with a flagged aspect, Section 10' },
    { key: 'Parent Contacts', value: String(buildParentLog(mentor).length), tone: 'green', note: 'Logged this term, Section 11' },
    { key: 'Record Books Complete', value: `${mentees.filter((mentee) => mentee.meetingsHeld > 0).length}/${mentees.length}`, tone: 'ink', note: 'At least one mentoring session recorded' },
  ];
}

export function mentorTimeline(mentor) {
  const rows = listMentees(mentor.id).map(summariseMentee);
  const attendanceEvents = rows
    .filter((student) => student.attendanceBelowRequirement)
    .sort((a, b) => a.attendance - b.attendance)
    .slice(0, 3)
    .map((student) => ({
      id: `attendance-${student.id}`,
      type: 'attendance',
      date: student.lastMeeting,
      title: `Attendance follow-up — ${student.name} at ${student.attendance}%`,
    }));
  const meetingEvents = rows
    .filter((student) => student.meetingsOverdue > 0)
    .sort((a, b) => b.meetingsOverdue - a.meetingsOverdue)
    .slice(0, 3)
    .map((student) => ({
      id: `meeting-${student.id}`,
      type: 'meeting',
      date: student.lastMeeting,
      title: `Mentoring follow-up due — ${student.name} (${student.meetingsOverdue} overdue)`,
    }));
  return [...attendanceEvents, ...meetingEvents].slice(0, 6);
}
