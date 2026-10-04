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
  passwordHash: bcrypt.hashSync(password, 12),
}));

const mentors = clone(MENTORS);
const mentees = clone(MENTEES);
const students = new Map([[STUDENT_PROFILE.id, clone(STUDENT_PROFILE)]]);
const signedInMentee = mentees.find((mentee) => mentee.rollNumber === STUDENT_PROFILE.identity.rollNumber);
if (signedInMentee) {
  signedInMentee.recordBook = students.get(STUDENT_PROFILE.id);
  signedInMentee.recordBook.meetingsDue = signedInMentee.meetingsDue;
  signedInMentee.meetingsHeld = signedInMentee.recordBook.meetings?.length ?? 0;
  signedInMentee.lastMeeting = signedInMentee.recordBook.meetings?.[0]?.date ?? null;
}
const classAdvisors = clone(CLASS_ADVISORS);
const yearCoordinators = clone(YEAR_COORDINATORS);
const classMeetings = clone(CLASS_MEETINGS);
const grievances = clone(GRIEVANCES);
const coordinatorEvents = clone(COORDINATOR_EVENTS);
const odRequests = clone(OD_REQUESTS);

const uploadHistory = [
  {
    id: 'up-1',
    filename: '2024_BCS_Semester_5_Master_Data.xlsx',
    mode: 'master',
    totalRows: 40,
    insertedCount: 40,
    updatedCount: 0,
    uploadedBy: 'Anitha P',
    uploadedAt: '2026-07-02T10:30:00.000Z',
    status: 'Completed',
  },
  {
    id: 'up-2',
    filename: 'MyCamu_July_Attendance_Dump.xlsx',
    mode: 'attendance',
    totalRows: 40,
    insertedCount: 0,
    updatedCount: 40,
    uploadedBy: 'Anitha P',
    uploadedAt: '2026-07-28T14:15:00.000Z',
    status: 'Completed',
  },
];

let sequence = 1000;
const nextId = (prefix) => `${prefix}-${++sequence}`;

function normalizeEvidenceFiles(files = []) {
  return files.map((file) => ({
    id: nextId('evidence'),
    uploadedOn: new Date().toISOString(),
    name: file.name,
    contentType: file.contentType,
    size: file.size,
    dataUrl: file.dataUrl,
  }));
}

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

export function listMentors() {
  return mentors;
}

export function listUploadHistory() {
  return uploadHistory;
}

export function addUploadLog(log) {
  const entry = { id: nextId('up'), uploadedAt: new Date().toISOString(), status: 'Completed', ...log };
  uploadHistory.unshift(entry);
  return entry;
}

let cachedStudentPasswordHash = null;
function getDefaultStudentPasswordHash() {
  if (!cachedStudentPasswordHash) {
    cachedStudentPasswordHash = bcrypt.hashSync('mmrms@2026', 10);
  }
  return cachedStudentPasswordHash;
}

export function bulkUpsertMentees(records = [], options = {}) {
  let insertedCount = 0;
  let updatedCount = 0;
  const processed = [];

  for (const item of records) {
    const roll = String(item.rollNumber).trim().toUpperCase();
    const existingIndex = mentees.findIndex((m) => m.rollNumber.toUpperCase() === roll);
    const isExisting = existingIndex !== -1;
    const current = isExisting ? mentees[existingIndex] : null;

    const attendance = (item.attendance !== undefined && item.attendance !== null && item.attendance !== '')
      ? item.attendance
      : (current ? current.attendance : 85);

    const gpa = (item.gpa !== undefined && item.gpa !== null && item.gpa !== '')
      ? item.gpa
      : (current ? current.gpa : 7.5);

    const standingArrears = (item.standingArrears !== undefined && item.standingArrears !== null && item.standingArrears !== '')
      ? item.standingArrears
      : (current ? current.standingArrears : 0);

    let flagReason = null;
    let suggestedAction = null;
    if (attendance < 70) {
      flagReason = 'Low Attendance';
      suggestedAction = 'Parent follow-up';
    } else if (attendance < 75) {
      flagReason = 'Attendance Shortage';
      suggestedAction = 'Attendance plan';
    } else if (standingArrears > 0) {
      flagReason = 'Standing Arrear';
      suggestedAction = 'Academic intervention';
    }

    if (isExisting) {
      current.name = item.name || current.name;
      current.year = item.year || current.year;
      current.section = item.section || current.section;
      current.gpa = gpa;
      current.attendance = attendance;
      current.standingArrears = standingArrears;
      if (item.mentorId) current.mentorId = item.mentorId;
      if (item.staffCode) current.staffCode = item.staffCode;
      current.flagReason = flagReason;
      current.suggestedAction = suggestedAction;

      const profile = students.get(current.id);
      if (profile) {
        profile.identity.name = current.name;
        profile.identity.section = current.section;
      }

      updatedCount++;
      processed.push({ ...current, _action: 'updated' });
    } else {
      const newId = nextId('s');
      const newMentee = {
        id: newId,
        staffCode: item.staffCode || 'KCT01763',
        mentorId: item.mentorId || 'm-1',
        mentorName: item.mentorName || 'Bharathi Priya',
        rollNumber: roll,
        name: item.name,
        year: item.year || 3,
        section: item.section || '2024 BCS',
        gpa,
        attendance,
        standingArrears,
        meetingsHeld: 0,
        meetingsDue: 4,
        readinessDone: 0,
        wellbeingConcerns: 0,
        lastMeeting: null,
        flagReason,
        suggestedAction,
      };
      mentees.push(newMentee);

      const studentEmail = (item.email || `${roll.toLowerCase()}@kct.ac.in`).toLowerCase();
      if (!findUserByEmail(studentEmail)) {
        users.push({
          id: nextId('u'),
          role: 'student',
          name: newMentee.name,
          email: studentEmail,
          passwordHash: getDefaultStudentPasswordHash(),
          department: 'Computer Science and Engineering',
          designation: `${newMentee.section} · Year ${newMentee.year}`,
          studentId: newId,
        });
      }

      insertedCount++;
      processed.push({ ...newMentee, _action: 'inserted' });
    }
  }

  for (const mentor of mentors) {
    mentor.menteeCount = mentees.filter((m) => m.mentorId === mentor.id).length;
  }

  const logEntry = {
    id: nextId('up'),
    filename: options.filename || 'excel_upload.xlsx',
    mode: options.mode || 'master',
    totalRows: records.length,
    insertedCount,
    updatedCount,
    uploadedBy: options.uploadedBy || 'Anitha P',
    uploadedAt: new Date().toISOString(),
    status: 'Completed',
  };
  uploadHistory.unshift(logEntry);

  return {
    success: true,
    total: records.length,
    insertedCount,
    updatedCount,
    log: logEntry,
    processed,
  };
}

export function bulkUpsertFaculty(records = [], options = {}) {
  let insertedCount = 0;
  let updatedCount = 0;
  const processed = [];

  for (const item of records) {
    const code = String(item.staffCode).trim().toUpperCase();
    const email = String(item.email).trim().toLowerCase();

    const existingIndex = mentors.findIndex(
      (m) => (m.staffCode && m.staffCode.toUpperCase() === code) ||
             (m.email && m.email.toLowerCase() === email)
    );

    if (existingIndex !== -1) {
      const current = mentors[existingIndex];
      current.name = item.name || current.name;
      current.designation = item.designation || current.designation;
      current.department = item.department || current.department;
      if (item.email) current.email = item.email;
      if (item.staffCode) current.staffCode = item.staffCode;

      const user = findUserByEmail(email) || users.find((u) => u.mentorId === current.id);
      if (user) {
        user.name = current.name;
        user.designation = current.designation;
        user.email = current.email;
      }

      updatedCount++;
      processed.push({ ...current, _action: 'updated' });
    } else {
      const newId = `m-${mentors.length + 1}`;
      const newMentor = {
        id: newId,
        staffCode: code,
        name: item.name,
        email: email || `${code.toLowerCase()}@kct.ac.in`,
        mobile: item.mobile || '+91 98430 00000',
        department: item.department || 'Computer Science and Engineering',
        designation: item.designation || 'Mentor',
        cabin: item.cabin || 'CSE Block · Faculty Cabin',
        batches: ['2024-28 Batch'],
        menteeCount: 0,
        yearCoordinator: options.uploadedBy || 'Anitha P',
      };
      mentors.push(newMentor);

      if (!findUserByEmail(newMentor.email)) {
        users.push({
          id: nextId('u'),
          role: 'mentor',
          name: newMentor.name,
          email: newMentor.email,
          passwordHash: getDefaultStudentPasswordHash(),
          department: newMentor.department,
          designation: newMentor.designation,
          mentorId: newId,
        });
      }

      insertedCount++;
      processed.push({ ...newMentor, _action: 'inserted' });
    }
  }

  for (const mentor of mentors) {
    mentor.menteeCount = mentees.filter(
      (m) => m.mentorId === mentor.id || (m.staffCode && mentor.staffCode && m.staffCode.toUpperCase() === mentor.staffCode.toUpperCase())
    ).length;
  }

  const logEntry = {
    id: nextId('up'),
    filename: options.filename || 'faculty_upload.xlsx',
    mode: 'faculty',
    totalRows: records.length,
    insertedCount,
    updatedCount,
    uploadedBy: options.uploadedBy || 'Anitha P',
    uploadedAt: new Date().toISOString(),
    status: 'Completed',
  };
  uploadHistory.unshift(logEntry);

  return {
    success: true,
    total: records.length,
    insertedCount,
    updatedCount,
    log: logEntry,
    processed,
  };
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
  const record = { id: nextId('ev'), status: 'Planned', owner: 'Anitha P', notes: '', ...entry };
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
  if (mentee.recordBook) {
    mentee.recordBook.meetings ??= [];
    mentee.recordBook.meetings.unshift(record);
  }
  mentee.meetingsHeld = number;
  mentee.lastMeeting = record.date;
  if (mentee.flagReason === 'Overdue Meeting' && mentee.meetingsHeld >= mentee.meetingsDue) {
    mentee.flagReason = null;
    mentee.suggestedAction = null;
  }
  return record;
}

/* ── student writes ────────────────────────────────────────────────────── */

/** Unified Activities & Achievements — replaces Participation, Certifications, Internship sections. */
export function addActivity(studentId, entry) {
  const student = students.get(studentId);
  if (!student) return null;
  student.activities ??= [];
  const { evidence: evidenceFiles = [], ...rest } = entry;
  const record = {
    id: nextId('act'),
    createdAt: new Date().toISOString(),
    evidence: normalizeEvidenceFiles(evidenceFiles),
    ...rest,
  };
  student.activities.unshift(record);
  return record;
}

/** Section 6 — Participation Record. */
export function addParticipation(studentId, group, entry) {
  const student = students.get(studentId);
  if (!student) return null;
  student.participation ??= { technical: [], coCurricular: [], extraCurricular: [] };
  student.participation[group] ??= [];
  const { evidence: evidenceFiles = [], ...rest } = entry;
  const record = {
    id: nextId(group === 'technical' ? 'tech' : group === 'coCurricular' ? 'co' : 'ec'),
    evidence: normalizeEvidenceFiles(evidenceFiles),
    ...rest,
  };
  student.participation[group].unshift(record);
  return record;
}

/** Section 7 — Certification Tracker. */
export function addCertification(studentId, entry) {
  const student = students.get(studentId);
  if (!student) return null;
  student.certifications ??= [];
  const { evidence: evidenceFiles = [], ...rest } = entry;
  const record = {
    id: nextId('cert'),
    completionDate: rest.completionDate ?? null,
    evidence: normalizeEvidenceFiles(evidenceFiles),
    ...rest,
  };
  student.certifications.unshift(record);
  return record;
}

/** Section 9 — Internship / Project records. */
export function addInternshipProject(studentId, entry) {
  const student = students.get(studentId);
  if (!student) return null;
  student.internshipAndProject ??= { records: [] };
  if (!student.internshipAndProject.records) {
    student.internshipAndProject = { records: [] };
  }
  const { evidence: evidenceFiles = [], ...rest } = entry;
  const record = {
    id: nextId('ip'),
    evidence: normalizeEvidenceFiles(evidenceFiles),
    ...rest,
  };
  student.internshipAndProject.records.unshift(record);
  return record;
}

/** Evidence uploaded by a student for a growth and career record. */
export function addEvidence(studentId, area, entry) {
  const student = students.get(studentId);
  if (!student) return null;
  student.evidence ??= {
    participation: [],
    certifications: [],
    placement: [],
    internship: [],
  };
  student.evidence[area] ??= [];
  const record = { id: nextId('evidence'), uploadedOn: new Date().toISOString(), ...entry };
  student.evidence[area].unshift(record);
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
