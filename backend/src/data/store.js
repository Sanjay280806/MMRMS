/**
 * In-memory store. Seed data is cloned at boot so request handlers can mutate
 * freely; restarting the server restores the seed. Swap these functions for a
 * database layer without touching the routes.
 */
import bcrypt from 'bcryptjs';
import {
  CLASS_ADVISORS,
  CLASS_MEETINGS,
  CONCERNS,
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
const concerns = clone(CONCERNS);
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

export function listYearCoordinators(includeArchived = false) {
  return includeArchived ? yearCoordinators : yearCoordinators.filter((c) => !c.archived);
}

export function listArchivedYearCoordinators() {
  return yearCoordinators.filter((c) => c.archived);
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

export function listMentors(includeArchived = false) {
  return includeArchived ? mentors : mentors.filter((m) => !m.archived);
}

export function listArchivedMentors() {
  return mentors.filter((m) => m.archived);
}

export function listEligibleFaculty() {
  const list = [];
  const seenEmails = new Set();

  // Active mentors
  for (const m of mentors.filter((m) => !m.archived)) {
    if (!seenEmails.has(m.email.toLowerCase())) {
      seenEmails.add(m.email.toLowerCase());
      list.push({
        id: m.id,
        staffCode: m.staffCode,
        name: m.name,
        email: m.email,
        mobile: m.mobile,
        department: m.department,
        designation: m.designation,
        cabin: m.cabin,
        currentRole: 'Mentor',
        menteeCount: m.menteeCount || 0,
      });
    }
  }

  // Active Class Advisors
  for (const ca of classAdvisors.filter((ca) => !ca.archived)) {
    if (!seenEmails.has(ca.email.toLowerCase())) {
      seenEmails.add(ca.email.toLowerCase());
      list.push({
        id: ca.id,
        staffCode: 'KCT-CA',
        name: ca.name,
        email: ca.email,
        mobile: ca.mobile,
        department: ca.department,
        designation: ca.designation,
        cabin: ca.room,
        currentRole: 'Class Advisor',
        menteeCount: 0,
      });
    }
  }

  // Pre-seed distinguished CSE faculty members for selection
  const facultyRoster = [
    { staffCode: 'KCT01880', name: 'Dr. Ramesh Kumar K', email: 'rameshkumar.k@kct.ac.in', mobile: '+91 98432 44101', department: 'Computer Science and Engineering', designation: 'Associate Professor', cabin: 'CSE Block · Room 302', currentRole: 'Faculty' },
    { staffCode: 'KCT01892', name: 'Dr. Kavitha S', email: 'kavitha.s@kct.ac.in', mobile: '+91 98433 55202', department: 'Computer Science and Engineering', designation: 'Associate Professor', cabin: 'CSE Block · Room 304', currentRole: 'Faculty' },
    { staffCode: 'KCT01915', name: 'Prof. Suresh M', email: 'suresh.m@kct.ac.in', mobile: '+91 98434 66303', department: 'Computer Science and Engineering', designation: 'Assistant Professor (SrG)', cabin: 'CSE Block · Room 218', currentRole: 'Faculty' },
    { staffCode: 'KCT01930', name: 'Prof. Nithya R', email: 'nithya.r@kct.ac.in', mobile: '+91 98435 77404', department: 'Computer Science and Engineering', designation: 'Assistant Professor', cabin: 'CSE Block · Room 220', currentRole: 'Faculty' },
  ];

  for (const f of facultyRoster) {
    if (!seenEmails.has(f.email.toLowerCase())) {
      seenEmails.add(f.email.toLowerCase());
      list.push({ ...f, id: f.staffCode, menteeCount: 0 });
    }
  }

  return list;
}

export function reassignYearCoordinator({ cohortId, newFaculty, reason = 'Discontinued / Reassigned' }) {
  if (!cohortId) throw new Error('cohortId is required');
  if (!newFaculty || !newFaculty.name || !newFaculty.email) {
    throw new Error('New faculty name and institutional email are required');
  }

  const cId = String(cohortId).toUpperCase().trim();
  const oldCoordinator = yearCoordinators.find((yc) => yc.cohortId?.toUpperCase() === cId && !yc.archived);

  // Soft-delete / Archive the departing YC
  if (oldCoordinator) {
    oldCoordinator.status = 'Archived';
    oldCoordinator.archived = true;
    oldCoordinator.archivedAt = new Date().toISOString();
    oldCoordinator.archivedReason = reason;

    // Archive old YC user account
    const oldUser = users.find(
      (u) => (u.coordinatorId === oldCoordinator.id || (u.email?.toLowerCase() === oldCoordinator.email?.toLowerCase() && u.role === 'coordinator')) && !u.archived
    );
    if (oldUser) {
      oldUser.archived = true;
      oldUser.archivedAt = new Date().toISOString();
      oldUser.archivedReason = reason;
      oldUser.status = 'Archived';
    }
  }

  // Create the new Year Coordinator record
  const newYcId = nextId('yc');
  const newEmail = String(newFaculty.email).toLowerCase().trim();
  const cohortName = oldCoordinator?.cohortName || `${cId} BCS`;
  const yearName = oldCoordinator?.year || 'II Year';
  const programme = oldCoordinator?.programme || 'B.E. Computer Science and Engineering';

  const newCoordinator = {
    id: newYcId,
    name: newFaculty.name.trim(),
    email: newEmail,
    mobile: newFaculty.mobile || '+91 98430 00000',
    department: newFaculty.department || 'Computer Science and Engineering',
    designation: newFaculty.designation || 'Year Coordinator',
    year: yearName,
    cohortId: cId,
    cohortName,
    programme,
    room: newFaculty.room || newFaculty.cabin || 'CSE Block · Room 210',
    status: 'Active',
    archived: false,
    assignedAt: new Date().toISOString(),
    replacedCoordinator: oldCoordinator ? {
      id: oldCoordinator.id,
      name: oldCoordinator.name,
      email: oldCoordinator.email,
      archivedAt: oldCoordinator.archivedAt,
      archivedReason: oldCoordinator.archivedReason,
    } : null,
  };

  yearCoordinators.push(newCoordinator);

  // Update or provision user account for new YC
  let existingUser = users.find((u) => u.email.toLowerCase() === newEmail);
  if (existingUser) {
    existingUser.role = 'coordinator';
    existingUser.coordinatorId = newYcId;
    existingUser.cohortId = cId;
    existingUser.archived = false;
    existingUser.status = 'Active';
    existingUser.designation = `Year Coordinator · ${cohortName}`;
  } else {
    existingUser = {
      id: nextId('u'),
      role: 'coordinator',
      name: newCoordinator.name,
      email: newEmail,
      passwordHash: getDefaultStudentPasswordHash(),
      department: newCoordinator.department,
      designation: `Year Coordinator · ${cohortName}`,
      coordinatorId: newYcId,
      cohortId: cId,
      archived: false,
      status: 'Active',
    };
    users.push(existingUser);
  }

  // Historical records auditing guarantee:
  // All historical events (coordinatorEvents) and upload logs (uploadHistory)
  // stay intact with the original creator's attribution for auditing.
  for (const advisor of classAdvisors) {
    if (advisor.yearCoordinator === oldCoordinator?.name) {
      advisor.yearCoordinator = newCoordinator.name;
    }
  }
  for (const mentor of mentors) {
    if (mentor.yearCoordinator === oldCoordinator?.name) {
      mentor.yearCoordinator = newCoordinator.name;
    }
  }

  return {
    success: true,
    cohortId: cId,
    cohortName,
    newCoordinator,
    oldCoordinator: oldCoordinator ? {
      id: oldCoordinator.id,
      name: oldCoordinator.name,
      email: oldCoordinator.email,
      archivedAt: oldCoordinator.archivedAt,
      archivedReason: oldCoordinator.archivedReason,
    } : null,
    message: `Cohort ${cohortName} reassigned to ${newCoordinator.name}. Historical records of previous coordinator remain intact for auditing.`,
  };
}

export function reassignMentor({ departingMentorId, targetMentorId, menteeIds = [], archiveDepartingMentor = true, reason = 'Discontinued / Reassigned' }) {
  if (!departingMentorId) throw new Error('departingMentorId is required');
  if (!targetMentorId) throw new Error('targetMentorId is required');
  if (departingMentorId === targetMentorId) {
    throw new Error('Departing mentor and target mentor cannot be the same faculty member');
  }

  const departing = mentors.find((m) => m.id === departingMentorId);
  if (!departing) throw new Error(`Departing mentor "${departingMentorId}" not found`);

  const target = mentors.find((m) => m.id === targetMentorId);
  if (!target) throw new Error(`Target mentor "${targetMentorId}" not found`);

  const allCurrentMentees = mentees.filter((m) => m.mentorId === departing.id);
  const targetMenteeIds = Array.isArray(menteeIds) && menteeIds.length > 0
    ? new Set(menteeIds.map(String))
    : new Set(allCurrentMentees.map((m) => m.id));

  const transferred = [];

  for (const mentee of allCurrentMentees) {
    if (!targetMenteeIds.has(mentee.id)) continue;

    // Record audit trail of transfer
    mentee.mentorTransferHistory ??= [];
    mentee.mentorTransferHistory.unshift({
      id: nextId('tr'),
      fromMentorId: departing.id,
      fromMentorName: departing.name,
      toMentorId: target.id,
      toMentorName: target.name,
      transferredAt: new Date().toISOString(),
      reason,
    });

    // Seamless preservation guarantee:
    // Only the mentor reference is updated.
    // ALL Section 12 meeting logs, SMART goals, attendance records,
    // progress reviews, and notes are 100% PRESERVED.
    mentee.mentorId = target.id;
    mentee.mentorName = target.name;
    mentee.staffCode = target.staffCode;

    if (mentee.recordBook) {
      mentee.recordBook.mentorId = target.id;
      if (mentee.recordBook.identity) {
        mentee.recordBook.identity.mentor = target.name;
      }
    }

    // Also update student profile if active in memory
    const studentProfile = students.get(mentee.id);
    if (studentProfile) {
      if (studentProfile.profile?.mentor) {
        studentProfile.profile.mentor = {
          id: target.id,
          name: target.name,
          staffCode: target.staffCode,
          email: target.email,
          mobile: target.mobile,
          cabin: target.cabin,
        };
      }
      if (studentProfile.identity) {
        studentProfile.identity.mentor = target.name;
      }
      studentProfile.mentorTransferHistory = mentee.mentorTransferHistory;
    }

    transferred.push(mentee);
  }

  const remainingMentees = mentees.filter((m) => m.mentorId === departing.id);

  if (archiveDepartingMentor || remainingMentees.length === 0) {
    departing.status = 'Archived';
    departing.archived = true;
    departing.archivedAt = new Date().toISOString();
    departing.archivedReason = reason;

    // Archive user account
    const mentorUser = users.find(
      (u) => (u.mentorId === departing.id || (u.email?.toLowerCase() === departing.email?.toLowerCase() && u.role === 'mentor')) && !u.archived
    );
    if (mentorUser) {
      mentorUser.archived = true;
      mentorUser.archivedAt = new Date().toISOString();
      mentorUser.archivedReason = reason;
      mentorUser.status = 'Archived';
    }
  }

  // Recalculate mentee counts
  for (const m of mentors) {
    m.menteeCount = mentees.filter((s) => s.mentorId === m.id).length;
  }

  return {
    success: true,
    departingMentor: {
      id: departing.id,
      name: departing.name,
      staffCode: departing.staffCode,
      archived: Boolean(departing.archived),
      archivedAt: departing.archivedAt,
      remainingMenteesCount: remainingMentees.length,
    },
    targetMentor: {
      id: target.id,
      name: target.name,
      staffCode: target.staffCode,
      totalMenteesCount: target.menteeCount,
    },
    transferredCount: transferred.length,
    transferredMentees: transferred.map((m) => ({
      id: m.id,
      name: m.name,
      rollNumber: m.rollNumber,
      section: m.section,
    })),
    message: `Successfully reassigned ${transferred.length} mentees from ${departing.name} to ${target.name}. All progress logs and historical records are preserved.`,
  };
}

export function listArchivedStaff() {
  const archivedCoordinators = yearCoordinators
    .filter((yc) => yc.archived)
    .map((yc) => ({
      ...yc,
      role: 'Year Coordinator',
      auditPreservedRecords: {
        eventsCount: coordinatorEvents.filter((e) => e.owner === yc.name).length,
        uploadLogsCount: uploadHistory.filter((u) => u.uploadedBy === yc.name).length,
      },
    }));

  const archivedMentors = mentors
    .filter((m) => m.archived)
    .map((m) => ({
      ...m,
      role: 'Mentor',
      auditPreservedRecords: {
        totalHistoricalMentees: mentees.filter((s) => s.mentorTransferHistory?.some((t) => t.fromMentorId === m.id)).length,
      },
    }));

  return {
    coordinators: archivedCoordinators,
    mentors: archivedMentors,
  };
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

/* ── student concerns lifecycle (Q6) ─────────────────────────────────── */

export function listConcerns(filter = {}) {
  let list = concerns;
  if (filter.studentId) {
    list = list.filter((c) => c.studentId === filter.studentId);
  }
  if (filter.mentorId) {
    list = list.filter((c) => c.mentorId === filter.mentorId);
  }
  if (filter.status) {
    list = list.filter((c) => c.status === filter.status);
  }
  return list;
}

export function findConcernById(id) {
  return concerns.find((c) => c.id === id);
}

export function addConcern({ studentId, category, priority, subject, description }) {
  const student = findStudentById(studentId) || findMenteeById(studentId);
  const mentorId = student?.mentorId || student?.profile?.mentor?.id || 'm-1';
  const mentor = findMentorById(mentorId);

  const record = {
    id: nextId('cn'),
    studentId,
    studentName: student?.identity?.name || student?.name || 'Student',
    rollNumber: student?.identity?.rollNumber || student?.rollNumber || '—',
    mentorId,
    mentorName: mentor?.name || 'Bharathi Priya',
    category: category || 'Academic',
    priority: priority || 'Medium',
    subject: subject.trim(),
    description: (description || '').trim(),
    status: 'OPEN',
    raisedAt: new Date().toISOString(),
    resolution: null,
    resolvedAt: null,
    resolvedBy: null,
    evidence: [],
    acknowledgedAt: null,
    studentFeedback: null,
  };

  concerns.unshift(record);
  return record;
}

export function resolveConcern(id, { mentorId, resolution, evidence = [] }) {
  const concern = concerns.find((c) => c.id === id);
  if (!concern) return null;
  const mentor = findMentorById(mentorId);

  concern.status = 'RESOLVED';
  concern.resolution = resolution.trim();
  concern.resolvedAt = new Date().toISOString();
  concern.resolvedBy = mentor?.name || concern.mentorName;
  if (Array.isArray(evidence) && evidence.length > 0) {
    concern.evidence = normalizeEvidenceFiles(evidence);
  }
  return concern;
}

export function acknowledgeConcern(id, { studentId, feedback = '' }) {
  const concern = concerns.find((c) => c.id === id);
  if (!concern) return null;

  concern.status = 'CLOSED';
  concern.acknowledgedAt = new Date().toISOString();
  if (feedback?.trim()) {
    concern.studentFeedback = feedback.trim();
  }
  return concern;
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
