/**
 * Expands a roster entry into a full record-book-shaped student.
 *
 * The result is passed through the *same* builder the signed-in student uses,
 * so a mentee's page in the Mentor Console and that student's own record book
 * are guaranteed to agree — there is only one derivation path.
 */
import {
  EXTRA_CURRICULAR_CATEGORIES,
  READINESS_ITEMS,
  SKILL_ITEMS,
  WELLBEING_ASPECTS,
} from '../data/seed.js';
import { clamp } from './health.js';
import { buildStudentRecordBook, initials } from './student.js';

const SUBJECTS_BY_YEAR = {
  2: [
    ['Data Structures', '22CS301'], ['Digital Systems', '22CS302'], ['Object Oriented Programming', '22CS303'],
    ['Discrete Mathematics', '22MA301'], ['Communication Skills', '22HS301'],
  ],
  3: [
    ['Database Management Systems', '22CS501'], ['Operating Systems', '22CS502'], ['Computer Architecture', '22CS503'],
    ['Theory of Computation', '22CS504'], ['Web Technologies (Elective)', '22CSE51'],
  ],
  4: [
    ['Compiler Design', '22CS701'], ['Machine Learning', '22CS702'], ['Computer Networks', '22CS703'],
    ['Software Engineering', '22CS704'], ['Cloud Computing (Elective)', '22CSE71'],
  ],
};

const ORDINAL = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

/** Small deterministic spread so twelve mentees don't look identical. */
const seedOf = (name) => (name.charCodeAt(0) + name.length) % 3;

export function menteeToStudent(mentee) {
  if (mentee.recordBook) return structuredClone(mentee.recordBook);

  const seed = seedOf(mentee.name);
  const semester = mentee.year * 2 - 1;
  const completedSemesters = semester - 1;
  const admitYear = mentee.rollNumber
    ? 2000 + Number(mentee.rollNumber.slice(0, 2))
    : 2026 - mentee.year + 1;
  const roll = mentee.rollNumber ?? `${String(admitYear).slice(2)}CSE0${140 + ((mentee.name.length * 7) % 260)}`;
  const first = mentee.name.split(' ')[0].toLowerCase();
  const last = mentee.name.split(' ').slice(-1)[0].toLowerCase();

  /* Section 2 — GPAs converging on the roster's headline figure. */
  const performance = Array.from({ length: completedSemesters }, (_, i) => {
    const drift = -0.3 + (i / Math.max(1, completedSemesters - 1)) * 0.45 + (i % 2 ? 0.08 : -0.05);
    const gpa = Number(clamp(mentee.gpa + drift, 4.5, 9.8).toFixed(1));
    const isArrearSem = mentee.standingArrears > 0 && i >= completedSemesters - mentee.standingArrears;
    return {
      semester: i + 1,
      gpa,
      standingArrears: isArrearSem ? mentee.standingArrears : 0,
      newArrears: isArrearSem ? 1 : 0,
      clearedArrears: 0,
    };
  });

  /* Section 3 — three reviews trending to the current figure. */
  const attendanceReviews = [
    { date: '28 Jun 2026', percentage: clamp(mentee.attendance - 6, 35, 99) },
    { date: '12 Jul 2026', percentage: clamp(mentee.attendance - 3, 35, 99) },
    { date: '26 Jul 2026', percentage: mentee.attendance },
  ].map((r, i) => ({
    ...r,
    shortage: r.percentage < 75 ? 'Below requirement in one or more subjects' : 'None',
    actionTaken:
      r.percentage < 75
        ? i === 2
          ? 'Parents informed; fortnightly review continues until the shortage clears.'
          : 'Shortage letter issued; weekly monitoring agreed.'
        : 'No action required — above requirement.',
  }));

  /* Section 4 — CIA 1, CIA 2 and Model for the current semester. */
  const coursePerformance = (SUBJECTS_BY_YEAR[mentee.year] ?? SUBJECTS_BY_YEAR[4]).map(
    ([subject, code], i) => {
      const base = mentee.gpa * 9;
      const spread = ((i * 13 + seed * 7) % 15) - 6;
      return {
        subject,
        code,
        cia1: Math.round(clamp(base + spread - 4, 32, 96)),
        cia2: Math.round(clamp(base + spread + 2, 32, 98)),
        model: Math.round(clamp(base + spread, 32, 97)),
        attendance: Math.round(clamp(mentee.attendance + ((i * 11 + seed * 5) % 17) - 8, 42, 98)),
      };
    },
  );

  /* Section 5 — one row per standing arrear. */
  const arrearPool = [
    ['Discrete Mathematics', '22MA201', 2],
    ['Theory of Computation', '22CS504', 5],
    ['Digital Systems', '22CS302', 3],
  ];
  const arrears = arrearPool.slice(0, mentee.standingArrears).map(([subject, code, sem], i) => ({
    id: `${mentee.id}-arr-${i + 1}`,
    subject,
    code,
    semester: sem,
    status: i === 0 ? 'Registered' : 'Pending',
    actionPlan:
      i === 0
        ? 'Registered for the November supplementary exam; weekly problem sets with the subject handler.'
        : 'Revision plan to be agreed at the next mentoring meeting.',
    targetCompletion: 'Nov 2026',
  }));

  /* Section 6 */
  const technicalPool = [
    { activity: 'Departmental Hackathon', role: 'Participant', achievement: 'Finalist' },
    { activity: 'KCT Codeathon 2025', role: 'Participant', achievement: 'Top 40' },
    { activity: 'Paper Presentation — IoT', role: 'Presenter', achievement: 'Second prize' },
  ];
  const participation = {
    technical: technicalPool.slice(0, seed + 1).map((t, i) => ({
      id: `${mentee.id}-tech-${i + 1}`,
      date: ['Mar 2026', 'Sep 2025', 'Feb 2026'][i],
      evidence: i === 0 ? [] : [],
      ...t,
    })),
    coCurricular:
      mentee.wellbeingConcerns > 1
        ? []
        : [{
            id: `${mentee.id}-co-1`,
            activity: 'Departmental Symposium',
            date: 'Aug 2025',
            role: 'Volunteer',
            achievement: 'Event support',
            evidence: [],
          }],
    extraCurricular: [
      {
        id: `${mentee.id}-ec-1`,
        activity: 'Campus activity',
        activityType: EXTRA_CURRICULAR_CATEGORIES[seed],
        role: 'Participant',
        achievement: 'Active participant',
        date: 'Dec 2025',
        evidence: [],
      },
    ],
  };

  /* Section 7 */
  const certPool = [
    { certification: 'Data Structures', platform: 'NPTEL', completionDate: 'Dec 2025', evidence: [] },
    { certification: 'Python for Everybody', platform: 'Coursera', completionDate: null, evidence: [] },
    { certification: 'AWS Cloud Practitioner', platform: 'AWS Skill Builder', completionDate: null, evidence: [] },
  ];
  const certifications = certPool
    .slice(0, mentee.readinessDone >= 4 ? 3 : 2)
    .map((c, i) => ({ id: `${mentee.id}-cert-${i + 1}`, ...c }));

  /* Section 8 — the first `readinessDone` items are complete. */
  const placementReadiness = READINESS_ITEMS.map((item, i) => ({
    item,
    status: i < mentee.readinessDone ? 'Completed' : i < mentee.readinessDone + 2 ? 'In Progress' : 'Not Started',
    note: i < mentee.readinessDone ? 'Verified by mentor' : i < mentee.readinessDone + 2 ? 'Underway' : 'Yet to begin',
  }));

  /* Section 9 */
  const internshipAndProject = {
    records:
      mentee.year === 4 && mentee.readinessDone >= 3
        ? [
            {
              id: `${mentee.id}-ip-1`,
              type: 'Internship',
              internshipCompany: 'Cognizant, Coimbatore',
              internshipRole: 'Intern — Application Development',
              internshipPeriod: 'May – Jul 2026',
              facultyGuide: ['Prof. R. Ramesh', 'Dr. K. Anitha', 'Prof. S. Vignesh'][seed],
              description: 'Application development internship.',
              evidence: [],
            },
            {
              id: `${mentee.id}-ip-2`,
              type: 'Project',
              projectTitle: ['Library Seat Tracker', 'Crop Disease Classifier', 'Campus Grievance Bot'][seed],
              facultyGuide: ['Prof. R. Ramesh', 'Dr. K. Anitha', 'Prof. S. Vignesh'][seed],
              projectDescription: 'Reviewed at the last mentoring meeting.',
              expectedCompletion: mentee.year === 4 ? 'Apr 2027' : 'Apr 2028',
              evidence: [],
            },
          ]
        : [
            {
              id: `${mentee.id}-ip-1`,
              type: 'Project',
              projectTitle: ['Library Seat Tracker', 'Crop Disease Classifier', 'Campus Grievance Bot'][seed],
              facultyGuide: ['Prof. R. Ramesh', 'Dr. K. Anitha', 'Prof. S. Vignesh'][seed],
              projectDescription: 'Reviewed at the last mentoring meeting.',
              expectedCompletion: mentee.year === 4 ? 'Apr 2027' : 'Apr 2028',
              evidence: [],
            },
          ],
  };

  /* Section 10 — the first `wellbeingConcerns` aspects are flagged. */
  const wellbeingRemarks = {
    'Physical Health': ['No concerns reported.', 'Frequent absence due to illness; medical certificate on file.'],
    'Emotional Well-being': ['Settled and communicative.', 'Exam-related stress; counselling referral discussed.'],
    'Financial Concerns': ['None reported.', 'Scholarship disbursement delayed; escalated to the office.'],
    'Family Support': ['Parents engaged and responsive.', 'Parents difficult to reach; only one call connected this term.'],
    'Hostel/Transport Issues': ['No issues reported.', 'Long commute affecting first-hour attendance.'],
    'Any Special Support Needed': ['None at present.', 'Subject coaching and communication training requested.'],
  };
  const wellbeing = WELLBEING_ASPECTS.map((aspect, i) => {
    const concern = i < mentee.wellbeingConcerns;
    return { aspect, remarks: wellbeingRemarks[aspect][concern ? 1 : 0], concern };
  });

  /* Section 11 */
  const parentInteractions = Array.from({ length: Math.min(3, mentee.meetingsHeld) }, (_, i) => ({
    id: `${mentee.id}-pi-${i + 1}`,
    date: ['30 Jun 2026', '15 Jul 2026', '26 Jul 2026'][i],
    mode: ['Phone', 'Video Call', 'Phone'][i],
    discussion:
      mentee.attendance < 75
        ? 'Attendance shortage and the agreed recovery plan.'
        : 'Academic progress and placement preparation for the coming term.',
    action: mentee.attendance < 75 ? 'Parents to monitor daily attendance; review in two weeks.' : 'No action required.',
  }));

  /* Section 12 */
  const savedMeetings = mentee.meetingLogs ?? [];
  const generatedMeetingCount = Math.max(0, mentee.meetingsHeld - savedMeetings.length);
  const generatedMeetings = Array.from({ length: generatedMeetingCount }, (_, i) => {
    const number = generatedMeetingCount - i;
    const struggling = mentee.attendance < 75 || mentee.standingArrears > 0;
    return {
      id: `${mentee.id}-mtg-${number}`,
      number,
      date: ['22 Jul 2026', '05 Jul 2026', '14 Jun 2026', '12 Aug 2025'][i] ?? '12 Aug 2025',
      duration: '30 min',
      mode: i % 2 === 0 ? 'Online' : 'Offline',
      agenda: struggling
        ? ['Academic Review', 'Attendance Review', 'Goal Progress']
        : ['Academic Review', 'Placement Preparation', 'Goal Progress'],
      topicsDiscussed: struggling
        ? 'Attendance recovery plan, pending internals, and the arrear revision schedule.'
        : 'Steady progress reviewed; elective choices and placement preparation discussed.',
      studentConcerns: struggling
        ? 'Difficulty keeping up with theory subjects alongside lab work.'
        : 'Choosing between higher studies and placements.',
      mentorSuggestions: struggling
        ? 'Fixed weekly study schedule; meet the subject handler before each internal.'
        : 'Continue the current routine; begin mock interviews this term.',
      supportRequired: struggling ? 'Subject coaching and a condonation letter.' : 'None.',
      actionItems: [
        {
          id: `${mentee.id}-ai-${number}-1`,
          task: struggling ? 'Attend all classes for three weeks' : 'Complete two mock interviews',
          responsible: 'Student',
          targetDate: '10 Aug 2026',
          status: i === 0 ? 'In Progress' : 'Completed',
        },
        {
          id: `${mentee.id}-ai-${number}-2`,
          task: struggling ? 'Inform parents of the shortage' : 'Share updated resume',
          responsible: i === 0 ? 'Mentor' : 'Student',
          targetDate: '15 Aug 2026',
          status: i === 0 ? 'Pending' : 'Completed',
        },
      ],
      progressSinceLastMeeting: {
        achievements: i === mentee.meetingsHeld - 1 ? '—' : 'Improvement noted since the previous review.',
        pendingTasks: struggling ? 'Attendance recovery still incomplete.' : 'None outstanding.',
        improvementObserved: struggling ? 'Slow but steady.' : 'Consistent.',
      },
      goalProgress: [{ goalId: `${mentee.id}-g-1`, currentStatus: `GPA at ${mentee.gpa}`, progress: clamp(Math.round(mentee.gpa * 10), 10, 95) }],
      mentorRemarks: struggling ? 'Needs close monitoring this term.' : 'On track. Continue the current plan.',
      studentRemarks: 'Noted and agreed.',
      nextReviewDate: '10 Aug 2026',
      mentorSigned: true,
      studentSigned: i !== 0,
    };
  });
  const meetings = [...savedMeetings, ...generatedMeetings];

  /* SMART goals */
  const goals = [
    {
      id: `${mentee.id}-g-1`,
      text: `Raise CGPA to ${(mentee.gpa + 0.4).toFixed(1)}`,
      specific: 'Improve internal marks in theory subjects',
      measure: 'Semester result',
      target: (mentee.gpa + 0.4).toFixed(1),
      deadline: 'Dec 2026',
      percent: clamp(Math.round((mentee.gpa / (mentee.gpa + 0.4)) * 90), 10, 95),
      setBy: 'mentor',
      done: false,
      acknowledged: mentee.meetingsHeld >= 3,
    },
    {
      id: `${mentee.id}-g-2`,
      text: 'Attendance ≥ 85% in every subject',
      specific: 'Clear all shortages and hold 85%',
      measure: 'Fortnightly attendance review',
      target: '85%',
      deadline: 'Aug 2026',
      percent: clamp(Math.round((mentee.attendance / 85) * 100), 5, 100),
      setBy: 'mentor',
      done: mentee.attendance >= 85,
      acknowledged: mentee.meetingsHeld >= 2,
    },
    {
      id: `${mentee.id}-g-3`,
      text: 'Complete one certification this term',
      specific: 'Finish an online certification relevant to the career goal',
      measure: 'Certificate uploaded',
      target: '1 certification',
      deadline: 'Sep 2026',
      percent: 40 + seed * 20,
      setBy: 'self',
      done: false,
      acknowledged: true,
    },
  ];

  return {
    id: mentee.id,
    mentorId: mentee.mentorId,
    meetingsDue: mentee.meetingsDue,

    identity: {
      name: mentee.name,
      rollNumber: roll,
      registerNumber: `7311${admitYear % 100}104${roll.slice(-3)}`,
      department: 'Computer Science and Engineering',
      programme: 'B.E. Computer Science and Engineering',
      year: `${ORDINAL[mentee.year]} Year`,
      semester,
      batch: `${admitYear}-${String(admitYear + 4).slice(2)} Batch`,
      section: mentee.section,
      dateOfBirth: `${(mentee.name.length % 28) + 1} ${['Jan', 'Apr', 'Jul', 'Oct'][seed % 4]} ${2026 - 18 - mentee.year}`,
      mobile: `+91 98${String(40100000 + ((mentee.name.charCodeAt(1) * 31013) % 899999)).slice(0, 8)}`,
      email: `${first}.${last}@kct.ac.in`,
      parentName: `${mentee.name.split(' ').slice(-1)[0]} (guardian)`,
      parentContact: `+91 94${String(43200000 + ((mentee.name.length * 618031) % 799999)).slice(0, 8)}`,
      address: `${(mentee.name.length % 60) + 1}, ${['Peelamedu', 'Saravanampatti', 'Ganapathy'][seed]}, Coimbatore`,
      yearCoordinator: 'Anitha P',
      mentorSince: 'Aug 2024',
      bloodGroup: ['O+', 'B+', 'A+'][seed],
      hostelOrDayScholar: seed === 0 ? 'Hosteller' : 'Day Scholar',
    },

    academicBackground: {
      tenthPercentage: Number(clamp(mentee.gpa * 10 + 4, 55, 98).toFixed(1)),
      qualifyingExam: seed === 1 ? 'Diploma' : '12th',
      qualifyingPercentage: Number(clamp(mentee.gpa * 10, 50, 96).toFixed(1)),
      favouriteSubjects: ['Programming', 'Networks'].slice(0, seed + 1),
      difficultSubjects: mentee.standingArrears > 0 ? ['Theory of Computation', 'Mathematics'] : ['Mathematics'],
      remarks: mentee.standingArrears > 0 ? 'Struggles with mathematical subjects.' : 'Balanced across subjects.',
    },

    aspirations: {
      dreamCareer: ['Software Engineer', 'Data Analyst', 'Systems Engineer'][seed],
      path: mentee.gpa >= 8.5 ? 'Higher Studies' : 'Job',
      preferredCompanies: [['TCS', 'Infosys'], ['Zoho', 'Freshworks'], ['Bosch', 'HCL']][seed],
      areasOfInterest: [['Web Development'], ['Data Science'], ['Networking']][seed],
      certificationsCompleted: certifications.filter((c) => (c.evidence?.length ?? 0) > 0).map((c) => c.certification),
      certificationsPlanned: certifications.filter((c) => !(c.evidence?.length)).map((c) => c.certification),
    },

    skillAssessment: SKILL_ITEMS.map((skill, i) => {
      const rating = clamp(Math.round((mentee.gpa / 2) + ((i + seed) % 3) - 1), 1, 5);
      return {
        skill,
        rating,
        mentorObservation:
          rating >= 4 ? 'A clear strength — give visible responsibility here.'
            : rating === 3 ? 'Adequate; improves with practice and feedback.'
              : 'Needs deliberate work this term.',
      };
    }),

    selfAssessment: {
      strengths: mentee.gpa >= 8 ? 'Consistent with coursework and dependable in team projects.' : 'Willing to put in the hours when given a clear plan.',
      areasForImprovement: mentee.attendance < 75 ? 'Attendance and time management.' : 'Confidence when speaking to a group.',
      challenges: mentee.wellbeingConcerns > 1 ? 'Personal circumstances are affecting concentration this term.' : 'Balancing coursework with project work.',
    },

    mentorAssessment: {
      academic: `GPA around ${mentee.gpa}. ${mentee.standingArrears > 0 ? `${mentee.standingArrears} standing arrear(s) to clear.` : 'No arrears.'}`,
      behaviour: mentee.meetingsHeld >= 3 ? 'Attends mentoring sessions regularly.' : 'Has missed scheduled sessions; follow up needed.',
      communication: 'Reserved in group settings; responds well one to one.',
      attendance: mentee.attendance < 75 ? 'Below the 75% requirement — under fortnightly review.' : 'Comfortably above requirement.',
      confidence: mentee.gpa >= 8 ? 'Assured in familiar areas.' : 'Needs encouragement to attempt harder problems.',
      learningAbility: 'Practical topics come easily; theory needs a longer runway.',
      recommendations:
        mentee.attendance < 75
          ? 'Clear the attendance shortage, then focus on the standing arrear before the semester review.'
          : 'Maintain the current routine and begin placement preparation in earnest.',
      recordedOn: '14 Jun 2026',
    },

    performance,
    cgpaTarget: Number((mentee.gpa + 0.4).toFixed(1)),
    attendanceReviews,
    coursePerformance,
    arrears,
    participation,
    certifications,
    placementReadiness,
    internshipAndProject,
    wellbeing,
    parentInteractions,
    meetings,
    goals,
    supportRequests: [],
    messages: [],
  };
}

/** The mentor's copy of a mentee's record book. */
export function buildMenteeRecordBook(mentee) {
  const book = buildStudentRecordBook(menteeToStudent(mentee));
  return {
    ...book,
    roster: {
      flagReason: mentee.flagReason ?? null,
      suggestedAction: mentee.suggestedAction ?? null,
      lastMeeting: mentee.lastMeeting,
      meetingsHeld: mentee.meetingsHeld,
      meetingsDue: mentee.meetingsDue,
      initials: initials(mentee.name),
    },
  };
}
