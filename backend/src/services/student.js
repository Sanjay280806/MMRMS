import {
  ATTENDANCE_REQUIREMENT,
  ACTION_STATUSES,
  ARREAR_STATUSES,
  CAREER_PATHS,
  CERTIFICATION_STATUSES,
  EXTRA_CURRICULAR_CATEGORIES,
  GPA_SCALE,
  INSTITUTION,
  MARK_SCALE,
  MEETING_AGENDA_ITEMS,
  MEETING_MODES,
  MENTOR_ASSESSMENT_ITEMS,
  PARENT_CONTACT_MODES,
  READINESS_ITEMS,
  READINESS_STATUSES,
  SKILL_ITEMS,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  WELLBEING_ASPECTS,
} from '../data/seed.js';
import {
  academicScore,
  attendanceScore,
  attendanceTone,
  careerScore,
  cgpaSeries,
  currentCgpa,
  dimensionList,
  healthIndex,
  healthLabel,
  interactionScore,
  scoreTone,
  subjectAverage,
  subjectStatus,
  wellbeingScore,
  weakestDimension,
} from './health.js';
import { findMentorById } from '../data/store.js';

/* ── shared derivations, reused by the mentor's view of a mentee ────────── */

export function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Count of arrears not yet cleared — Section 5. */
export function standingArrearCount(arrears = []) {
  return arrears.filter((a) => a.status !== 'Cleared').length;
}

/** Flattens every meeting's action items — Section 12. */
export function allActionItems(meetings = []) {
  return meetings.flatMap((m) =>
    (m.actionItems ?? []).map((item) => ({ ...item, meetingNumber: m.number, meetingDate: m.date })),
  );
}

/**
 * The five health dimensions for one student, each traced to its section.
 * `meetingsDue` defaults to the meetings held so a complete book scores fairly.
 */
export function computeDimensions(student) {
  const performance = cgpaSeries(student.performance ?? []);
  const actionItems = allActionItems(student.meetings);
  const closed = actionItems.filter((a) => a.status === 'Completed').length;

  return {
    academic: academicScore({
      cgpa: currentCgpa(student.performance ?? []),
      standingArrears: standingArrearCount(student.arrears),
    }),
    attendance: attendanceScore(student.attendanceReviews ?? []),
    interaction: interactionScore({
      meetingsHeld: student.meetings?.length ?? 0,
      meetingsDue: student.meetingsDue ?? student.meetings?.length ?? 1,
      actionItemsClosed: closed,
      actionItemsTotal: actionItems.length,
    }),
    career: careerScore({
      readiness: student.placementReadiness ?? [],
      certifications: student.certifications ?? [],
    }),
    wellbeing: wellbeingScore(student.wellbeing ?? []),
    _performance: performance,
  };
}

/** Section 4 rows, with the average, status and attendance tone worked out. */
export function decorateCourses(courses = []) {
  return courses.map((c) => {
    const status = subjectStatus(c);
    return {
      ...c,
      average: subjectAverage(c),
      attendanceTone: c.attendance == null ? null : attendanceTone(c.attendance),
      status: status.label,
      statusTone: status.tone,
      shortage: c.attendance != null && c.attendance < ATTENDANCE_REQUIREMENT,
    };
  });
}

export function decorateArrears(arrears = []) {
  const tone = { Cleared: 'green', Registered: 'indigo', Pending: 'rose' };
  return arrears.map((a) => ({ ...a, tone: tone[a.status] ?? 'slate' }));
}

export function decorateReadiness(readiness = []) {
  const tone = { Completed: 'green', 'In Progress': 'amber', 'Not Started': 'rose' };
  const percent = { Completed: 100, 'In Progress': 50, 'Not Started': 0 };
  return readiness.map((r) => ({ ...r, tone: tone[r.status] ?? 'slate', percent: percent[r.status] ?? 0 }));
}

export function decorateCertifications(certifications = []) {
  const tone = { Completed: 'green', 'In Progress': 'indigo', Planned: 'slate' };
  return certifications.map((c) => ({ ...c, tone: tone[c.status] ?? 'slate' }));
}

export function decorateGoals(goals = []) {
  return goals.map((g) => {
    const status = g.done || g.percent >= 100 ? 'Completed' : g.percent < 60 ? 'At Risk' : 'On Track';
    const tone = { Completed: 'green', 'At Risk': 'amber', 'On Track': 'indigo' }[status];
    return {
      ...g,
      status,
      tone,
      needsAcknowledgement: g.setBy === 'mentor' && !g.done && !g.acknowledged,
    };
  });
}

/** Section 12 rows, with action-item progress and goal titles resolved. */
export function decorateMeetings(meetings = [], goals = []) {
  const statusTone = { Completed: 'green', 'In Progress': 'indigo', Pending: 'amber' };

  return meetings.map((m) => {
    const items = m.actionItems ?? [];
    const closed = items.filter((i) => i.status === 'Completed').length;

    return {
      ...m,
      modeTone: m.mode === 'Online' ? 'indigo' : 'slate',
      actionItems: items.map((i) => ({ ...i, tone: statusTone[i.status] ?? 'slate' })),
      actionSummary: { closed, total: items.length },
      goalProgress: (m.goalProgress ?? []).map((gp) => ({
        ...gp,
        goal: goals.find((g) => g.id === gp.goalId)?.text ?? gp.goalId,
      })),
      signed: Boolean(m.mentorSigned && m.studentSigned),
    };
  });
}

export function decorateAttendanceReviews(reviews = []) {
  return reviews.map((r) => ({
    ...r,
    tone: attendanceTone(r.percentage),
    belowRequirement: r.percentage < ATTENDANCE_REQUIREMENT,
  }));
}

export function decorateSkills(skills = []) {
  // 1–5 ratings render as meters, so carry a percentage alongside the rating.
  return skills.map((s) => ({
    ...s,
    percent: (s.rating / 5) * 100,
    tone: s.rating >= 4 ? 'green' : s.rating >= 3 ? 'amber' : 'rose',
  }));
}

export function decorateWellbeing(aspects = []) {
  return aspects.map((a) => ({ ...a, tone: a.concern ? 'amber' : 'green' }));
}

/** Everything the record book's Section 1 holds, in book order. */
export function buildSectionOne(student) {
  const performance = cgpaSeries(student.performance ?? []);

  return {
    academicBackground: {
      ...student.academicBackground,
      currentCgpa: currentCgpa(student.performance ?? []),
      standingArrears: standingArrearCount(student.arrears),
      historyOfArrears: (student.arrears ?? []).length,
      gpaScale: GPA_SCALE,
      latestSemester: performance.at(-1)?.semester ?? null,
    },
    aspirations: { ...student.aspirations, careerPaths: CAREER_PATHS },
    skillAssessment: decorateSkills(student.skillAssessment),
    selfAssessment: student.selfAssessment,
    mentorAssessment: student.mentorAssessment,
  };
}

/* ── the full payload ───────────────────────────────────────────────────── */

/**
 * The complete Student Record Book. The client renders this directly — every
 * label, tone and derived figure is decided here so the mentor's copy of a
 * record book and the student's own can never disagree.
 */
export function buildStudentRecordBook(student) {
  const mentor = findMentorById(student.mentorId);
  const dimensions = computeDimensions(student);
  const { _performance: performance, ...healthDims } = dimensions;

  const index = healthIndex(healthDims);
  const weakest = weakestDimension(healthDims);
  const cgpa = currentCgpa(student.performance ?? []);
  const courses = decorateCourses(student.coursePerformance);
  const reviews = decorateAttendanceReviews(student.attendanceReviews);
  const goals = decorateGoals(student.goals);
  const actionItems = allActionItems(student.meetings);
  const openActions = actionItems.filter((a) => a.status !== 'Completed');

  return {
    institution: INSTITUTION,

    /* Record-book cover page. */
    identity: {
      ...student.identity,
      id: student.id,
      initials: initials(student.identity.name),
      mentor: mentor && {
        name: mentor.name,
        email: mentor.email,
        mobile: mentor.mobile,
        department: mentor.department,
        designation: mentor.designation,
        cabin: mentor.cabin,
        initials: initials(mentor.name),
      },
    },

    /* The derived summary that drives triage. */
    health: {
      index,
      tone: scoreTone(index),
      label: healthLabel(index),
      dimensions: dimensionList(healthDims),
      weakest: {
        ...weakest,
        explanation:
          `${weakest.name} (${weakest.value}) is pulling the overall index down the most — see ${weakest.source}.`,
      },
    },

    /* Section 1 */
    sectionOne: buildSectionOne(student),

    /* Section 2 */
    performance: {
      rows: performance,
      cgpa,
      cgpaTarget: student.cgpaTarget,
      cgpaGap: Number((student.cgpaTarget - cgpa).toFixed(1)),
      gpaScale: GPA_SCALE,
      standingArrears: standingArrearCount(student.arrears),
      totalArrears: (student.arrears ?? []).length,
    },

    /* Section 3 */
    attendance: {
      reviews,
      current: reviews.at(-1)?.percentage ?? null,
      tone: attendanceTone(reviews.at(-1)?.percentage ?? 0),
      requirement: ATTENDANCE_REQUIREMENT,
      shortageSubjects: courses.filter((c) => c.shortage).map((c) => ({
        subject: c.subject,
        attendance: c.attendance,
        classesToRecover: classesToRecover(c.attendance),
      })),
    },

    /* Section 4 */
    coursePerformance: { rows: courses, markScale: MARK_SCALE },

    /* Section 5 */
    arrears: { rows: decorateArrears(student.arrears), statuses: ARREAR_STATUSES },

    /* Section 6 */
    participation: {
      ...student.participation,
      categories: EXTRA_CURRICULAR_CATEGORIES,
      counts: {
        technical: student.participation?.technical?.length ?? 0,
        coCurricular: student.participation?.coCurricular?.length ?? 0,
        extraCurricular: student.participation?.extraCurricular?.length ?? 0,
      },
    },

    /* Section 7 */
    certifications: {
      rows: decorateCertifications(student.certifications),
      statuses: CERTIFICATION_STATUSES,
      completed: (student.certifications ?? []).filter((c) => c.status === 'Completed').length,
    },

    /* Section 8 */
    placementReadiness: {
      rows: decorateReadiness(student.placementReadiness),
      items: READINESS_ITEMS,
      statuses: READINESS_STATUSES,
      completed: (student.placementReadiness ?? []).filter((r) => r.status === 'Completed').length,
      total: READINESS_ITEMS.length,
    },

    /* Section 9 */
    internshipAndProject: student.internshipAndProject,

    /* Section 10 */
    wellbeing: {
      rows: decorateWellbeing(student.wellbeing),
      aspects: WELLBEING_ASPECTS,
      concerns: (student.wellbeing ?? []).filter((w) => w.concern).length,
    },

    /* Section 11 */
    parentInteractions: { rows: student.parentInteractions ?? [], modes: PARENT_CONTACT_MODES },

    /* Section 12 */
    meetings: {
      rows: decorateMeetings(student.meetings, student.goals),
      agendaItems: MEETING_AGENDA_ITEMS,
      modes: MEETING_MODES,
      actionStatuses: ACTION_STATUSES,
      total: student.meetings?.length ?? 0,
      openActionItems: openActions,
      nextReviewDate: student.meetings?.[0]?.nextReviewDate ?? null,
    },

    goals,

    support: {
      requests: (student.supportRequests ?? []).map((r) => ({
        ...r,
        tone: { Raised: 'amber', Replied: 'indigo', Resolved: 'green' }[r.status] ?? 'slate',
        priorityTone: { High: 'rose', Medium: 'indigo', Low: 'slate' }[r.priority] ?? 'slate',
      })),
      messages: student.messages ?? [],
      categories: SUPPORT_CATEGORIES,
      priorities: SUPPORT_PRIORITIES,
    },

    /* Vocabularies the client's forms need. */
    vocabularies: {
      skills: SKILL_ITEMS,
      mentorAssessmentItems: MENTOR_ASSESSMENT_ITEMS,
      extraCurricularCategories: EXTRA_CURRICULAR_CATEGORIES,
    },
  };
}

/**
 * Consecutive classes needed to climb back to the requirement, assuming a
 * 60-class subject. Feeds Section 3's "Action Taken" guidance.
 */
function classesToRecover(current, totalClasses = 60) {
  const attended = Math.round((current / 100) * totalClasses);
  let extra = 0;
  while (((attended + extra) / (totalClasses + extra)) * 100 < ATTENDANCE_REQUIREMENT) {
    extra += 1;
    if (extra > 200) break;
  }
  return extra;
}
