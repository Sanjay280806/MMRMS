/**
 * In-memory store. Seed data is cloned at boot so request handlers can mutate
 * freely; restarting the server restores the seed. Swap these functions for a
 * database layer without touching the routes.
 */
import bcrypt from 'bcryptjs';
import {
  CLASS_ADVISORS,
  CLASS_MEETINGS,
  COORDINATOR_EVENTS,
  GRIEVANCES,
  MENTEES,
  MENTORS,
  OD_REQUESTS,
  STUDENT_PROFILE,
  USERS,
  YEAR_COORDINATORS,
} from './seed.js';

const clone = (value) => structuredClone(value);

const users = USERS.map(({ password, ...rest }) => ({
  ...rest,
  passwordHash: bcrypt.hashSync(password, 10),
}));

const mentors = clone(MENTORS);
const mentees = clone(MENTEES);
const students = new Map([[STUDENT_PROFILE.id, clone(STUDENT_PROFILE)]]);
const classAdvisors = clone(CLASS_ADVISORS);
const yearCoordinators = clone(YEAR_COORDINATORS);
const classMeetings = clone(CLASS_MEETINGS);
const grievances = clone(GRIEVANCES);
const coordinatorEvents = clone(COORDINATOR_EVENTS);
const odRequests = clone(OD_REQUESTS);

let sequence = 1000;
const nextId = (prefix) => `${prefix}-${++sequence}`;

/* ── users ─────────────────────────────────────────────────────────────── */

export function findUserByEmail(email) {
  return users.find((u) => u.email.toLowerCase() === String(email).toLowerCase().trim());
}

export function findUserById(id) {
  return users.find((u) => u.id === id);
}

export function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.passwordHash);
}

/** The shape of a user handed to the client — never includes the hash. */
export function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

/* ── people ────────────────────────────────────────────────────────────── */

export function findMentorById(id) {
  return mentors.find((m) => m.id === id);
}

export function findClassAdvisorById(id) {
  return classAdvisors.find((advisor) => advisor.id === id);
}

export function findYearCoordinatorById(id) {
  return yearCoordinators.find((coordinator) => coordinator.id === id);
}

export function findStudentById(id) {
  return students.get(id);
}

export function listMentees(mentorId) {
  return mentees.filter((m) => m.mentorId === mentorId);
}

export function listAllMentees() {
  return mentees;
}

export function findMenteeById(id) {
  return mentees.find((m) => m.id === id);
}

export function listClassMeetings() {
  return classMeetings;
}

export function addClassMeeting(entry) {
  const record = { id: nextId('cm'), status: 'Scheduled', minutes: '', ...entry };
  classMeetings.unshift(record);
  return record;
}

export function listGrievances() {
  return grievances;
}

export function addGrievance(entry) {
  const record = { id: nextId('gr'), status: 'Raised', owner: 'Suganthi', ...entry };
  grievances.unshift(record);
  return record;
}

export function updateGrievanceStatus(id, status) {
  const grievance = grievances.find((item) => item.id === id);
  if (!grievance) return null;
  grievance.status = status;
  return grievance;
}

export function listCoordinatorEvents() {
  return coordinatorEvents;
}

export function addCoordinatorEvent(entry) {
  const record = { id: nextId('ev'), status: 'Planned', owner: 'Aarthi', notes: '', ...entry };
  coordinatorEvents.unshift(record);
  return record;
}

export function listOdRequests() {
  return odRequests;
}

export function updateOdRequestStatus(id, status, approvedBy = null) {
  const request = odRequests.find((item) => item.id === id);
  if (!request) return null;
  request.status = status;
  request.approvedBy = approvedBy;
  return request;
}

/** Structured Section 12 log created from the mentor console. */
export function addMentorMeeting(menteeId, entry) {
  const mentee = findMenteeById(menteeId);
  if (!mentee) return null;

  const number = mentee.meetingsHeld + 1;
  const record = {
    id: nextId('mtg'),
    number,
    duration: '30 min',
    mode: 'Offline',
    agenda: ['Academic Review'],
    studentConcerns: 'None recorded.',
    mentorSuggestions: 'Continue the agreed action plan.',
    supportRequired: 'None.',
    actionItems: [],
    progressSinceLastMeeting: {
      achievements: 'Recorded during the review.',
      pendingTasks: 'None.',
      improvementObserved: 'To be reviewed at the next meeting.',
    },
    goalProgress: [],
    mentorRemarks: '',
    studentRemarks: '',
    nextReviewDate: '',
    mentorSigned: true,
    studentSigned: false,
    ...entry,
  };
  record.actionItems = (record.actionItems ?? []).map((item) => ({
    id: item.id ?? nextId('ai'),
    responsible: 'Student',
    status: 'Pending',
    ...item,
  }));

  mentee.meetingLogs ??= [];
  mentee.meetingLogs.unshift(record);
  mentee.meetingsHeld = number;
  mentee.lastMeeting = record.date;
  if (mentee.flagReason === 'Overdue Meeting' && mentee.meetingsHeld >= mentee.meetingsDue) {
    mentee.flagReason = null;
    mentee.suggestedAction = null;
  }
  return record;
}

/* ── student writes ────────────────────────────────────────────────────── */

/** Section 6 — Participation Record. */
export function addParticipation(studentId, group, entry) {
  const student = students.get(studentId);
  if (!student) return null;
  student.participation ??= { technical: [], coCurricular: [], extraCurricular: [] };
  student.participation[group] ??= [];
  const record = { id: nextId(group === 'technical' ? 'tech' : group === 'coCurricular' ? 'co' : 'ec'), ...entry };
  student.participation[group].unshift(record);
  return record;
}

/** Section 7 — Certification Tracker. */
export function addCertification(studentId, entry) {
  const student = students.get(studentId);
  if (!student) return null;
  student.certifications ??= [];
  const record = {
    id: nextId('cert'),
    progress: entry.status === 'Completed' ? 100 : entry.status === 'In Progress' ? 50 : 0,
    completionDate: entry.status === 'Completed' ? entry.completionDate ?? null : null,
    ...entry,
  };
  student.certifications.unshift(record);
  return record;
}

/** Section 8 — Placement Readiness. */
export function updateReadiness(studentId, item, status, note) {
  const student = students.get(studentId);
  if (!student) return null;
  student.placementReadiness ??= [];
  const row = student.placementReadiness.find((r) => r.item === item);
  if (!row) return null;
  row.status = status;
  if (note !== undefined) row.note = note;
  return row;
}

/** Section 1E — Student Self Assessment. */
export function updateSelfAssessment(studentId, patch) {
  const student = students.get(studentId);
  if (!student) return null;
  student.selfAssessment ??= {};
  Object.assign(student.selfAssessment, patch);
  return student.selfAssessment;
}

/** Section 1C — the student's own 1–5 skill ratings. */
export function updateSkillRating(studentId, skill, rating) {
  const student = students.get(studentId);
  if (!student) return null;
  student.skillAssessment ??= [];
  const row = student.skillAssessment.find((s) => s.skill === skill);
  if (!row) return null;
  row.rating = rating;
  return row;
}

/** Section 12 — a student marking their own action item done. */
export function updateActionItem(studentId, actionId, status) {
  const student = students.get(studentId);
  if (!student) return null;
  for (const meeting of student.meetings ?? []) {
    const item = (meeting.actionItems ?? []).find((a) => a.id === actionId);
    if (item) {
      item.status = status;
      return { ...item, meetingNumber: meeting.number };
    }
  }
  return null;
}

/** SMART goal acknowledgement. */
export function acknowledgeGoal(studentId, goalId) {
  const student = students.get(studentId);
  if (!student) return null;
  student.goals ??= [];
  const goal = student.goals.find((g) => g.id === goalId);
  if (!goal) return null;
  goal.acknowledged = true;
  return goal;
}

/** Support request raised between meetings. */
export function addSupportRequest(studentId, { subject, category, priority }) {
  const student = students.get(studentId);
  if (!student) return null;
  student.supportRequests ??= [];
  const request = {
    id: `SR-${103 + student.supportRequests.length}`,
    subject,
    category,
    priority,
    raisedOn: 'Just now',
    status: 'Raised',
  };
  student.supportRequests.unshift(request);
  return request;
}

export function addMessage(studentId, text) {
  const student = students.get(studentId);
  if (!student) return null;
  student.messages ??= [];
  const message = { id: nextId('msg'), from: 'student', text, time: 'Just now' };
  student.messages.push(message);
  return message;
}
