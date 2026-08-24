/**
 * Seed data for MMRMS.
 *
 * The schema mirrors the institution's Mentor–Mentee Record Book: an identity
 * block, Section 1 (first-meeting profile), and Sections 2–12. Field names
 * track the printed book so a page in the app maps to a page in the file.
 *
 * Derived values (health index, CGPA, status labels, tones) are NOT stored —
 * they are computed in ../services so the API can never contradict itself.
 */

export const INSTITUTION = {
  name: 'Kumaraguru College of Technology',
  shortName: 'KCT',
  product: 'MMRMS',
  tagline: 'Mentor–Mentee Relationship Management',
  pitch:
    'One workspace connecting students, mentors, and departments — with the evidence trail your accreditation needs.',
  term: 'Odd Term 2026',
  recordBook: 'Mentor–Mentee Record Book',
};

/** Roles recognised by the sign-in screen, in institutional workflow order. */
export const ROLES = [
  {
    key: 'coordinator',
    name: 'Year Coordinator',
    short: 'Programme coordination',
    description:
      'Monitor year-wise progress, mentoring compliance, institutional events, OD approvals, and audit-ready evidence.',
    target: '/coordinator',
    targetLabel: 'Coordinator View',
  },
  {
    key: 'advisor',
    name: 'Class Advisor',
    short: 'Class care and coordination',
    description:
      'Monitor class performance, attendance, discipline, grievances, parent communication, and class meetings.',
    target: '/advisor',
    targetLabel: 'Class Advisor Console',
  },
  {
    key: 'mentor',
    name: 'Mentor',
    short: 'Guide your mentees',
    description:
      'Your mentees at a glance — record books, meetings, SMART goals, and reviews for the students you guide.',
    target: '/mentor',
    targetLabel: 'Mentor Console',
  },
  {
    key: 'student',
    name: 'Student',
    short: 'Your record book',
    description:
      'Your personal record book — profile, academics, activities, goals, and meeting history.',
    target: '/student',
    targetLabel: 'Student Record Book',
  },
];

/** Demo accounts. Every password is `mmrms@2026` — hashed at boot in store.js. */
export const USERS = [
  { id: 'u-coordinator', role: 'coordinator', name: 'Anitha P', email: 'anitha.p@kct.ac.in', password: 'mmrms@2026', department: 'Computer Science and Engineering', designation: 'Year Coordinator · 2024 BCS', coordinatorId: 'yc-1' },
  { id: 'u-advisor', role: 'advisor', name: 'Suganthi', email: 'suganthi@kct.ac.in', password: 'mmrms@2026', department: 'Computer Science and Engineering', designation: 'Class Advisor · 2024 BCS', advisorId: 'ca-1' },
  { id: 'u-mentor-1', role: 'mentor', name: 'Bharathi Priya', email: 'bharathi.priya@kct.ac.in', password: 'mmrms@2026', department: 'Computer Science and Engineering', designation: 'Mentor', mentorId: 'm-1' },
  { id: 'u-mentor-2', role: 'mentor', name: 'Asmitha Shree', email: 'asmitha.shree@kct.ac.in', password: 'mmrms@2026', department: 'Computer Science and Engineering', designation: 'Mentor', mentorId: 'm-2' },
  { id: 'u-student-1', role: 'student', name: 'ABHINAV DINESH', email: 'abhinav.dinesh@kct.ac.in', password: 'mmrms@2026', department: 'Computer Science and Engineering', designation: '2024 BCS · III Year', studentId: 's-1' },
];

export const MENTORS = [
  {
    id: 'm-1',
    staffCode: 'KCT01763',
    name: 'Bharathi Priya',
    email: 'bharathi.priya@kct.ac.in',
    mobile: '+91 98430 11702',
    department: 'Computer Science and Engineering',
    designation: 'Mentor',
    cabin: 'CSE Block · Room 214',
    batches: ['2024-28 Batch'],
    menteeCount: 33,
    yearCoordinator: 'Anitha P',
  },
  {
    id: 'm-2',
    staffCode: 'KCT01765',
    name: 'Asmitha Shree',
    email: 'asmitha.shree@kct.ac.in',
    mobile: '+91 98431 20765',
    department: 'Computer Science and Engineering',
    designation: 'Mentor',
    cabin: 'CSE Block · Room 216',
    batches: ['2024-28 Batch'],
    menteeCount: 7,
    yearCoordinator: 'Anitha P',
  },
];

export const CLASS_ADVISORS = [
  {
    id: 'ca-1',
    name: 'Suganthi',
    email: 'suganthi@kct.ac.in',
    mobile: '+91 98430 11831',
    department: 'Computer Science and Engineering',
    designation: 'Class Advisor',
    className: '2024 BCS',
    year: 'III Year',
    room: 'CSE Block · Room 205',
    yearCoordinator: 'Anitha P',
  },
];

export const YEAR_COORDINATORS = [
  {
    id: 'yc-1',
    name: 'Anitha P',
    email: 'anitha.p@kct.ac.in',
    mobile: '+91 98430 11904',
    department: 'Computer Science and Engineering',
    designation: 'Year Coordinator',
    year: 'III Year',
    programme: 'B.E. Computer Science and Engineering',
    room: 'CSE Block · Room 210',
  },
];

export const CLASS_MEETINGS = [
  { id: 'cm-1', date: '18 Jul 2026', title: 'Class committee meeting', agenda: 'Attendance review, course feedback, and internal assessment preparation.', status: 'Completed', minutes: 'Course feedback consolidated and shared with subject handlers.' },
  { id: 'cm-2', date: '12 Aug 2026', title: 'Internal assessment readiness', agenda: 'Review study plan and support requirements before CIA 1.', status: 'Scheduled', minutes: '' },
];

export const GRIEVANCES = [
  { id: 'gr-1', studentId: 's-106', category: 'Academic', subject: 'Request for additional Theory of Computation support', raisedOn: '18 Jul 2026', priority: 'High', status: 'In Progress', owner: 'Suganthi' },
  { id: 'gr-2', studentId: 's-128', category: 'Personal', subject: 'Transport concern affecting first-hour attendance', raisedOn: '15 Jul 2026', priority: 'Medium', status: 'Referred', owner: 'Suganthi' },
  { id: 'gr-3', studentId: 's-121', category: 'Academic', subject: 'Clarification on attendance condonation process', raisedOn: '10 Jul 2026', priority: 'Low', status: 'Resolved', owner: 'Suganthi' },
];

export const COORDINATOR_EVENTS = [
  { id: 'ev-1', type: 'PTM', title: 'Parent–Teacher Meeting', date: '22 Aug 2026', owner: 'Anitha P', status: 'Planned', notes: 'Attendance recovery and semester goals will be reviewed.' },
  { id: 'ev-2', type: 'Review', title: 'Monthly mentor review', date: '05 Aug 2026', owner: 'Anitha P', status: 'Scheduled', notes: 'Mentor compliance, at-risk learners, and action closures.' },
  { id: 'ev-3', type: 'Orientation', title: 'Career readiness orientation', date: '30 Jul 2026', owner: 'Anitha P', status: 'Completed', notes: 'Placement cell introduced the readiness plan for 2024 BCS.' },
];

export const OD_REQUESTS = [
  { id: 'od-1', studentId: 's-103', event: 'Inter-collegiate Hackathon', from: '08 Aug 2026', to: '09 Aug 2026', status: 'Pending', submittedOn: '28 Jul 2026', approvedBy: null },
  { id: 'od-2', studentId: 's-124', event: 'Paper presentation – National symposium', from: '02 Aug 2026', to: '02 Aug 2026', status: 'Approved', submittedOn: '20 Jul 2026', approvedBy: 'Anitha P' },
];

/* ────────────────────────────── shared vocabularies ───────────────────── */

/** Section 1C — skills rated 1–5 by the student, observed by the mentor. */
export const SKILL_ITEMS = ['Programming', 'Communication', 'Presentation', 'Team Work', 'Leadership'];

/** Section 1F — the mentor's initial assessment headings. */
export const MENTOR_ASSESSMENT_ITEMS = [
  'Academic',
  'Behaviour',
  'Communication',
  'Attendance',
  'Confidence',
  'Learning Ability',
];

/** Section 8 — the placement-readiness checklist, in book order. */
export const READINESS_ITEMS = [
  'Resume Prepared',
  'LinkedIn Profile',
  'GitHub Profile',
  'Aptitude Preparation',
  'Coding Practice',
  'Mock Interviews',
  'Communication Training',
];

export const READINESS_STATUSES = ['Not Started', 'In Progress', 'Completed'];

/** Section 10 — well-being aspects, in book order. */
export const WELLBEING_ASPECTS = [
  'Physical Health',
  'Emotional Well-being',
  'Financial Concerns',
  'Family Support',
  'Hostel/Transport Issues',
  'Any Special Support Needed',
];

/** Section 6 — extra-curricular categories, in book order. */
export const EXTRA_CURRICULAR_CATEGORIES = ['Sports', 'NSS', 'NCC', 'Clubs', 'Arts', 'Others'];

/** Section 12 — the printed agenda checklist. */
export const MEETING_AGENDA_ITEMS = [
  'Academic Review',
  'Attendance Review',
  'Placement Preparation',
  'Personal Discussion',
  'Goal Progress',
  'Other',
];

export const MEETING_TOPIC_CATEGORIES = ['Attendance', 'Academic', 'Profile Upgradation', 'Career', 'Others'];
export const SEMESTER_START_DATE = '2026-07-01';
export const MEETING_MODES = ['Offline', 'Online'];
export const ACTION_STATUSES = ['Pending', 'In Progress', 'Completed'];
export const ARREAR_STATUSES = ['Pending', 'Registered', 'Cleared'];
export const CERTIFICATION_STATUSES = ['Planned', 'In Progress', 'Completed'];
export const CAREER_PATHS = ['Job', 'Higher Studies', 'Entrepreneurship'];
export const PARENT_CONTACT_MODES = ['Phone', 'In Person', 'Video Call', 'Email'];

/** Institutional attendance requirement, referenced by Section 3 and 4. */
export const ATTENDANCE_REQUIREMENT = 75;

/** Marks in Sections 2 and 4 are on these scales. */
export const GPA_SCALE = 10;
export const MARK_SCALE = 100;

/**
 * The five dimensions of the health index and their institutional weights.
 * Each is computed from record-book fields — see ../services/health.js.
 */
export const HEALTH_DIMENSIONS = [
  { key: 'academic', name: 'Academic', weight: 0.25, source: 'CGPA and arrears' },
  { key: 'attendance', name: 'Attendance', weight: 0.2, source: 'Latest attendance review' },
  { key: 'interaction', name: 'Interaction', weight: 0.2, source: 'Meetings and action items' },
  { key: 'career', name: 'Career', weight: 0.15, source: 'Certifications and readiness' },
  { key: 'wellbeing', name: 'Well-being', weight: 0.2, source: 'Well-being review' },
];

/* ──────────────────────────── the signed-in student ───────────────────── */

export const STUDENT_PROFILE = {
  id: 's-1',
  mentorId: 'm-1',

  /** Record-book cover page. */
  identity: {
    name: 'ABHINAV DINESH',
    rollNumber: '24BCS001',
    registerNumber: '731124BCS001',
    department: 'Computer Science and Engineering',
    programme: 'B.E. Computer Science and Engineering',
    year: 'III Year',
    semester: 5,
    batch: '2024-28 Batch',
    section: '2024 BCS',
    dateOfBirth: '14 Mar 2006',
    mobile: '+91 98407 21884',
    email: 'abhinav.dinesh@kct.ac.in',
    parentName: 'Dinesh',
    parentContact: '+91 94432 55810',
    address: '17/4, Gandhi Nagar, Peelamedu, Coimbatore – 641004',
    yearCoordinator: 'Anitha P',
    mentorSince: 'Aug 2024',
    bloodGroup: 'O+',
    hostelOrDayScholar: 'Day Scholar',
  },

  /** Section 1A — Academic Background. */
  academicBackground: {
    tenthPercentage: 92.4,
    qualifyingExam: '12th',
    qualifyingPercentage: 88.6,
    favouriteSubjects: ['Data Structures', 'Software Engineering', 'Database Management'],
    difficultSubjects: ['Machine Learning', 'Theory of Computation'],
    remarks: 'Consistent performer; dips when a subject is maths-heavy.',
  },

  /** Section 1B — Career Aspirations. */
  aspirations: {
    dreamCareer: 'Full-stack product engineer',
    path: 'Job',
    preferredCompanies: ['Zoho', 'Freshworks', 'Atlassian'],
    areasOfInterest: ['Web Development', 'Cloud Computing', 'System Design'],
    certificationsCompleted: ['NPTEL — Database Management', 'KCT Full-Stack Workshop'],
    certificationsPlanned: ['AWS Solutions Architect – Associate', 'Meta Front-End Developer'],
  },

  /** Section 1C — Skill Assessment, rated 1–5. */
  skillAssessment: [
    { skill: 'Programming', rating: 4, mentorObservation: 'Strong in JS and Python; needs more DS practice under time pressure.' },
    { skill: 'Communication', rating: 3, mentorObservation: 'Clear in writing, hesitant when speaking to a room.' },
    { skill: 'Presentation', rating: 3, mentorObservation: 'Slides are neat; delivery improves noticeably with rehearsal.' },
    { skill: 'Team Work', rating: 4, mentorObservation: 'Dependable in the project team; shares work fairly.' },
    { skill: 'Leadership', rating: 2, mentorObservation: 'Avoids leading; should own one module end to end this term.' },
  ],

  /** Section 1E — Student Self Assessment. */
  selfAssessment: {
    strengths:
      'Consistent with coursework, comfortable building full-stack projects, and I finish what I start.',
    areasForImprovement:
      'Speaking confidently in front of a group, and keeping up attendance when project work gets heavy.',
    challenges:
      'Machine Learning is hard to follow, and my commute means I miss the first hour on some days.',
  },

  /** Section 1F — Mentor Initial Assessment. */
  mentorAssessment: {
    academic: 'Steady band of 8.0–8.3 GPA. Capable of more in theory-heavy subjects with earlier revision.',
    behaviour: 'Courteous, punctual to mentoring sessions, honest about difficulties.',
    communication: 'Written communication is good. Verbal confidence is the clear growth area.',
    attendance: 'Below requirement in Machine Learning. Needs weekly monitoring this semester.',
    confidence: 'Under-rates himself; hesitant to volunteer for visible roles.',
    learningAbility: 'Picks up practical topics quickly; needs longer runway for mathematical topics.',
    recommendations:
      'Enrol in Toastmasters KCT, lead one module of the final-year project, and clear the ML attendance shortage before the semester review.',
    recordedOn: '14 Jun 2026',
  },

  /** Section 2 — Academic Performance Tracker. */
  performance: [
    { semester: 1, gpa: 7.8, standingArrears: 0, newArrears: 0, clearedArrears: 0 },
    { semester: 2, gpa: 8.0, standingArrears: 1, newArrears: 1, clearedArrears: 0 },
    { semester: 3, gpa: 7.9, standingArrears: 0, newArrears: 0, clearedArrears: 1 },
    { semester: 4, gpa: 8.1, standingArrears: 0, newArrears: 0, clearedArrears: 0 },
    { semester: 5, gpa: 8.3, standingArrears: 0, newArrears: 0, clearedArrears: 0 },
    { semester: 6, gpa: 8.2, standingArrears: 1, newArrears: 1, clearedArrears: 0 },
  ],

  cgpaTarget: 8.5,

  /** Section 3 — Attendance Monitoring. */
  attendanceReviews: [
    { date: '28 Jun 2026', percentage: 71, shortage: 'Machine Learning', actionTaken: 'Shortage letter issued; weekly review agreed with mentor.' },
    { date: '12 Jul 2026', percentage: 74, shortage: 'Machine Learning', actionTaken: 'Attended 4 of 5 classes; parents informed by phone.' },
    { date: '26 Jul 2026', percentage: 78, shortage: 'Machine Learning', actionTaken: 'Improving. Continue weekly monitoring until 75% in all subjects.' },
  ],

  /** Section 4 — Course Performance (current semester). */
  coursePerformance: [
    { subject: 'Compiler Design', code: '22CS701', cia1: 78, cia2: 84, model: 82, attendance: 88 },
    { subject: 'Machine Learning', code: '22CS702', cia1: 66, cia2: 70, model: 74, attendance: 71 },
    { subject: 'Computer Networks', code: '22CS703', cia1: 75, cia2: 80, model: 78, attendance: 80 },
    { subject: 'Software Engineering', code: '22CS704', cia1: 82, cia2: 88, model: 85, attendance: 91 },
    { subject: 'Cloud Computing (Elective)', code: '22CSE71', cia1: 76, cia2: 82, model: 80, attendance: 76 },
  ],

  /** Section 5 — Arrear Tracking. */
  arrears: [
    {
      id: 'arr-1',
      subject: 'Discrete Mathematics',
      code: '22MA201',
      semester: 2,
      status: 'Cleared',
      actionPlan: 'Attended remedial classes; re-appeared in the Nov 2024 supplementary exam.',
      targetCompletion: 'Nov 2024',
    },
    {
      id: 'arr-2',
      subject: 'Theory of Computation',
      code: '22CS601',
      semester: 6,
      status: 'Registered',
      actionPlan: 'Weekly problem sets with the subject handler; revision plan reviewed each meeting.',
      targetCompletion: 'Nov 2026',
    },
  ],

  /** Section 6 — Participation Record. */
  participation: {
    technical: [
      { id: 'tech-1', activity: 'Smart India Hackathon — Regional Round', date: 'Mar 2026', role: 'Team Lead — Backend', achievement: 'Regional Winner' },
      { id: 'tech-2', activity: 'KCT Codeathon 2025', date: 'Sep 2025', role: 'Participant', achievement: 'Top 10 of 180 teams' },
      { id: 'tech-3', activity: 'IEEE Paper Presentation — Edge Computing', date: 'Feb 2026', role: 'Co-author & Presenter', achievement: 'Under review' },
    ],
    coCurricular: [
      { id: 'co-1', activity: 'IEEE Student Branch', date: 'Jan 2026', achievement: 'Elected Treasurer' },
      { id: 'co-2', activity: 'Departmental Technical Symposium', date: 'Aug 2025', achievement: 'Organising committee — logistics' },
    ],
    extraCurricular: [
      { id: 'ec-1', category: 'Sports', detail: 'District-level badminton — Runner-up', date: 'Nov 2025' },
      { id: 'ec-2', category: 'NSS', detail: 'Village literacy drive — 40 service hours', date: 'Dec 2025' },
      { id: 'ec-3', category: 'Clubs', detail: 'Coding Club — core member', date: 'Aug 2025' },
    ],
  },

  /** Section 7 — Certification Tracker. */
  certifications: [
    { id: 'cert-1', certification: 'Database Management Systems', platform: 'NPTEL', status: 'Completed', completionDate: 'Dec 2025', progress: 100 },
    { id: 'cert-2', certification: 'Full-Stack Web Development Workshop', platform: 'KCT · CSE Dept', status: 'Completed', completionDate: 'Jul 2025', progress: 100 },
    { id: 'cert-3', certification: 'Machine Learning Specialization', platform: 'Coursera', status: 'In Progress', completionDate: null, progress: 60 },
    { id: 'cert-4', certification: 'AWS Cloud Practitioner', platform: 'AWS Skill Builder', status: 'In Progress', completionDate: null, progress: 35 },
    { id: 'cert-5', certification: 'Meta Front-End Developer', platform: 'Coursera', status: 'Planned', completionDate: null, progress: 0 },
  ],

  /** Section 8 — Placement Readiness. */
  placementReadiness: [
    { item: 'Resume Prepared', status: 'Completed', note: 'Reviewed by mentor on 22 Jul 2026' },
    { item: 'LinkedIn Profile', status: 'Completed', note: 'linkedin.com/in/abhinav-dinesh' },
    { item: 'GitHub Profile', status: 'In Progress', note: '6 repositories; README quality to improve' },
    { item: 'Aptitude Preparation', status: 'In Progress', note: '18 of 30 practice sets done' },
    { item: 'Coding Practice', status: 'In Progress', note: '120 of 200 target problems' },
    { item: 'Mock Interviews', status: 'In Progress', note: '2 of 5 completed' },
    { item: 'Communication Training', status: 'Not Started', note: 'Toastmasters KCT — to enrol in Aug 2026' },
  ],

  /** Section 9 — Internship / Project Tracking. */
  internshipAndProject: {
    internshipCompany: 'Zoho Corporation, Chennai',
    internshipRole: 'Software Intern — Full-stack team',
    internshipPeriod: 'May – Jul 2026',
    internshipStatus: 'Completed',
    projectTitle: 'Smart Attendance System using Face Recognition',
    facultyGuide: 'Prof. R. Ramesh',
    progress: 55,
    progressNote: 'Dataset collected and model trained; classroom hardware integration pending.',
    expectedCompletion: 'Apr 2027',
  },

  /** Section 10 — Student Well-being. */
  wellbeing: [
    { aspect: 'Physical Health', remarks: 'No concerns. Plays badminton twice a week.', concern: false },
    { aspect: 'Emotional Well-being', remarks: 'Mild exam-time anxiety; manageable and discussed openly.', concern: false },
    { aspect: 'Financial Concerns', remarks: 'Receiving the merit scholarship. Disbursement for this term was delayed and has been followed up.', concern: true },
    { aspect: 'Family Support', remarks: 'Supportive. Parents attend review calls promptly.', concern: false },
    { aspect: 'Hostel/Transport Issues', remarks: 'Day scholar, 40 km commute. First-hour attendance is affected on rainy days.', concern: true },
    { aspect: 'Any Special Support Needed', remarks: 'Communication training and ML subject coaching.', concern: true },
  ],

  /** Section 11 — Parent Interaction Log. */
  parentInteractions: [
    { id: 'pi-1', date: '30 Jun 2026', mode: 'Phone', discussion: 'Informed parents of the Machine Learning attendance shortage and the recovery plan.', action: 'Father to ensure the 7:30 AM bus is taken; review in two weeks.' },
    { id: 'pi-2', date: '15 Jul 2026', mode: 'Video Call', discussion: 'Reviewed internship performance and placement season timeline.', action: 'Parents supportive of a product-company focus; no coaching-class pressure.' },
    { id: 'pi-3', date: '26 Jul 2026', mode: 'Phone', discussion: 'Attendance recovered to 78%. Discussed the pending Theory of Computation arrear.', action: 'Arrear exam registration to be completed before 10 Aug 2026.' },
  ],

  /** Section 12 — Mentor Meeting Log, newest first. */
  meetings: [
    {
      id: 'mtg-4',
      number: 4,
      date: '22 Jul 2026',
      duration: '30 min',
      mode: 'Online',
      agenda: ['Academic Review', 'Placement Preparation', 'Goal Progress'],
      topicsDiscussed:
        'Reviewed internship learnings at Zoho, the placement calendar for Aug 2026, and progress on the CGPA and attendance goals.',
      studentConcerns:
        'Unsure whether to target product companies or apply broadly; worried about the aptitude round.',
      mentorSuggestions:
        'Target product companies first — the internship is strong evidence. Finish the remaining 12 aptitude sets before the drive opens.',
      supportRequired: 'Mock interview slot with the placement cell; resume review.',
      actionItems: [
        { id: 'ai-41', task: 'Share resume draft for review', responsible: 'Student', targetDate: '28 Jul 2026', status: 'Completed' },
        { id: 'ai-42', task: 'Shortlist 10 target companies', responsible: 'Student', targetDate: '05 Aug 2026', status: 'In Progress' },
        { id: 'ai-43', task: 'Arrange a mock interview slot', responsible: 'Mentor', targetDate: '10 Aug 2026', status: 'Pending' },
      ],
      progressSinceLastMeeting: {
        achievements: 'Attendance recovered from 71% to 78%. DSA course completed.',
        pendingTasks: 'Theory of Computation arrear registration; Toastmasters enrolment.',
        improvementObserved: 'Noticeably more organised; brings written notes to each session.',
      },
      goalProgress: [
        { goalId: 'g-1', currentStatus: 'CGPA at 8.1 against a target of 8.5', progress: 64 },
        { goalId: 'g-2', currentStatus: 'Attendance at 78%, target 85%', progress: 62 },
      ],
      mentorRemarks:
        'Good recovery this month. Confidence is the remaining gap — a visible role in the project will help more than any course.',
      studentRemarks:
        'The weekly attendance check helped. I will finish the aptitude sets before the drive.',
      nextReviewDate: '05 Aug 2026',
      mentorSigned: true,
      studentSigned: true,
    },
    {
      id: 'mtg-3',
      number: 3,
      date: '05 Jul 2026',
      duration: '45 min',
      mode: 'Offline',
      agenda: ['Attendance Review', 'Academic Review', 'Personal Discussion'],
      topicsDiscussed:
        'Machine Learning attendance shortage, the recovery plan, and revision strategy for theory subjects.',
      studentConcerns: 'The 40 km commute makes the first hour unreliable, especially in the rain.',
      mentorSuggestions:
        'Take the earlier bus on ML days. Meet the class advisor about condonation for the days already lost.',
      supportRequired: 'A letter to the class advisor regarding condonation.',
      actionItems: [
        { id: 'ai-31', task: 'Attend all ML classes for three weeks', responsible: 'Student', targetDate: '26 Jul 2026', status: 'Completed' },
        { id: 'ai-32', task: 'Meet class advisor about condonation', responsible: 'Student', targetDate: '12 Jul 2026', status: 'Completed' },
        { id: 'ai-33', task: 'Inform parents of the shortage', responsible: 'Mentor', targetDate: '30 Jun 2026', status: 'Completed' },
      ],
      progressSinceLastMeeting: {
        achievements: 'Cleared two pending assignment backlogs.',
        pendingTasks: 'Attendance still below requirement in ML.',
        improvementObserved: 'More forthcoming about difficulties than in earlier meetings.',
      },
      goalProgress: [{ goalId: 'g-2', currentStatus: 'Attendance at 74%, below the 75% requirement', progress: 55 }],
      mentorRemarks: 'Shortage is fixable this term. Weekly review until it clears.',
      studentRemarks: 'I will take the 7:30 bus on Mondays and Thursdays.',
      nextReviewDate: '22 Jul 2026',
      mentorSigned: true,
      studentSigned: true,
    },
    {
      id: 'mtg-2',
      number: 2,
      date: '14 Jun 2026',
      duration: '40 min',
      mode: 'Offline',
      agenda: ['Goal Progress', 'Academic Review', 'Other'],
      topicsDiscussed:
        'Set SMART goals for the term: CGPA 8.5, attendance 85%, and a technical-writing habit.',
      studentConcerns: 'Unsure how to balance the final-year project with placement preparation.',
      mentorSuggestions:
        'Block Saturdays for the project; keep weekday evenings for placement preparation.',
      supportRequired: 'None at this stage.',
      actionItems: [
        { id: 'ai-21', task: 'Acknowledge the assigned goals', responsible: 'Student', targetDate: '20 Jun 2026', status: 'Completed' },
        { id: 'ai-22', task: 'Draft the first blog outline', responsible: 'Student', targetDate: '30 Jun 2026', status: 'Completed' },
      ],
      progressSinceLastMeeting: {
        achievements: 'Internship at Zoho secured and completed.',
        pendingTasks: 'Goal acknowledgement.',
        improvementObserved: 'Clearer sense of direction after the internship.',
      },
      goalProgress: [],
      mentorRemarks: 'Goals agreed and recorded. Review monthly.',
      studentRemarks: 'The CGPA target feels achievable if I start revision earlier.',
      nextReviewDate: '05 Jul 2026',
      mentorSigned: true,
      studentSigned: true,
    },
    {
      id: 'mtg-1',
      number: 1,
      date: '12 Aug 2024',
      duration: '60 min',
      mode: 'Offline',
      agenda: ['Personal Discussion', 'Academic Review', 'Other'],
      topicsDiscussed:
        'First meeting. Completed Section 1 of the record book — background, aspirations, skills and self-assessment.',
      studentConcerns: 'Adjusting to the pace of the programme.',
      mentorSuggestions: 'Build a weekly study routine early; join one technical club.',
      supportRequired: 'None.',
      actionItems: [
        { id: 'ai-11', task: 'Complete the student profile section', responsible: 'Student', targetDate: '20 Aug 2024', status: 'Completed' },
        { id: 'ai-12', task: 'Join one technical club', responsible: 'Student', targetDate: '30 Sep 2024', status: 'Completed' },
      ],
      progressSinceLastMeeting: { achievements: '—', pendingTasks: '—', improvementObserved: '—' },
      goalProgress: [],
      mentorRemarks: 'Profile recorded. Willing learner; monitor confidence.',
      studentRemarks: 'Looking forward to the mentoring sessions.',
      nextReviewDate: '14 Jun 2026',
      mentorSigned: true,
      studentSigned: true,
    },
  ],

  /**
   * SMART goals. They live outside a single meeting because progress is
   * reviewed across meetings (Section 12 → SMART Goal Progress).
   */
  goals: [
    { id: 'g-1', text: 'Raise CGPA to 8.5', specific: 'Lift CGPA from 8.1 to 8.5 by improving theory-subject internals', measure: 'CGPA in the semester result', target: '8.5', deadline: 'Dec 2026', percent: 64, setBy: 'mentor', done: false, acknowledged: false },
    { id: 'g-2', text: 'Attendance ≥ 85% in every subject', specific: 'Clear the Machine Learning shortage and hold 85% across all subjects', measure: 'Fortnightly attendance review (Section 3)', target: '85%', deadline: 'Aug 2026', percent: 62, setBy: 'mentor', done: false, acknowledged: false },
    { id: 'g-3', text: 'Complete the DSA course', specific: 'Finish the data structures and algorithms course before placements', measure: 'Course completion certificate', target: '100%', deadline: 'Jul 2026', percent: 100, setBy: 'self', done: true, acknowledged: true },
    { id: 'g-4', text: 'Publish 3 technical blog posts', specific: 'Write up the project learnings as public posts', measure: 'Posts published', target: '3 posts', deadline: 'Sep 2026', percent: 33, setBy: 'self', done: false, acknowledged: true },
  ],

  /**
   * Support requests raised between meetings. Feeds Section 12's "Student
   * Concerns" and "Support Required" at the next review.
   */
  supportRequests: [
    { id: 'SR-102', subject: 'Guidance on exam re-evaluation', category: 'Academic', priority: 'Medium', raisedOn: '12 Jul 2026', status: 'Replied' },
    { id: 'SR-096', subject: 'Elective selection for Semester 8', category: 'Career', priority: 'Low', raisedOn: '30 Jun 2026', status: 'Resolved' },
    { id: 'SR-091', subject: 'Scholarship disbursement delay', category: 'Administrative', priority: 'High', raisedOn: '20 Jun 2026', status: 'Resolved' },
  ],

  messages: [
    { id: 'msg-1', from: 'mentor', text: 'Well done on the DSA course, Abhinav. Let’s discuss your semester plan on Monday.', time: '22 Jul 2026, 4:10 PM' },
    { id: 'msg-2', from: 'student', text: 'Thank you ma’am! I’ll prepare my resume draft before the meeting.', time: '22 Jul 2026, 6:32 PM' },
  ],
};

export const SUPPORT_CATEGORIES = ['Academic', 'Personal', 'Career', 'Administrative'];
export const SUPPORT_PRIORITIES = ['Low', 'Medium', 'High'];

/* ─────────────────────────────── the mentor's roster ──────────────────── */

/**
 * Mentees. Each carries the handful of record-book facts that differ per
 * student; the rest of their record book is derived deterministically in
 * ../services/mentee.js so twelve students need no twelve fixtures.
 */
export const MENTEES = [
  { id: 's-101', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS001', name: 'ABHINAV DINESH', year: 3, section: '2024 BCS', gpa: 8.3, attendance: 84, standingArrears: 0, meetingsHeld: 3, meetingsDue: 4, readinessDone: 4, wellbeingConcerns: 0, lastMeeting: '22 Jul 2026', flagReason: 'Overdue Meeting', suggestedAction: 'Schedule review' },
  { id: 's-102', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS002', name: 'ABINAV SARAN PN', year: 3, section: '2024 BCS', gpa: 7.8, attendance: 79, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 3, wellbeingConcerns: 0, lastMeeting: '24 Jul 2026' },
  { id: 's-103', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS003', name: 'ABINAYA R', year: 3, section: '2024 BCS', gpa: 8.5, attendance: 88, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 5, wellbeingConcerns: 0, lastMeeting: '23 Jul 2026' },
  { id: 's-104', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS004', name: 'ABINETHRA G S', year: 3, section: '2024 BCS', gpa: 7.2, attendance: 72, standingArrears: 1, meetingsHeld: 3, meetingsDue: 4, readinessDone: 2, wellbeingConcerns: 1, lastMeeting: '12 Jul 2026', flagReason: 'Attendance Shortage', suggestedAction: 'Attendance plan' },
  { id: 's-105', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS005', name: 'ABIRAJ D', year: 3, section: '2024 BCS', gpa: 7.6, attendance: 81, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 3, wellbeingConcerns: 0, lastMeeting: '20 Jul 2026' },
  { id: 's-106', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS006', name: 'ABISHAI JARON I', year: 3, section: '2024 BCS', gpa: 6.8, attendance: 68, standingArrears: 2, meetingsHeld: 2, meetingsDue: 4, readinessDone: 1, wellbeingConcerns: 2, lastMeeting: '28 Jun 2026', flagReason: 'Low Attendance', suggestedAction: 'Parent follow-up' },
  { id: 's-107', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS007', name: 'ACHYUTHA RAKSHANA S H', year: 3, section: '2024 BCS', gpa: 8.7, attendance: 90, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 5, wellbeingConcerns: 0, lastMeeting: '25 Jul 2026' },
  { id: 's-108', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS008', name: 'ADITHIYAN V', year: 3, section: '2024 BCS', gpa: 7.4, attendance: 76, standingArrears: 0, meetingsHeld: 3, meetingsDue: 4, readinessDone: 3, wellbeingConcerns: 0, lastMeeting: '18 Jul 2026', flagReason: 'Overdue Meeting', suggestedAction: 'Schedule review' },
  { id: 's-109', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS009', name: 'ADITHYA S', year: 3, section: '2024 BCS', gpa: 8.1, attendance: 83, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 4, wellbeingConcerns: 0, lastMeeting: '21 Jul 2026' },
  { id: 's-110', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS010', name: 'ADVITH K K', year: 3, section: '2024 BCS', gpa: 7.0, attendance: 70, standingArrears: 1, meetingsHeld: 3, meetingsDue: 4, readinessDone: 2, wellbeingConcerns: 1, lastMeeting: '08 Jul 2026', flagReason: 'Standing Arrear', suggestedAction: 'Academic intervention' },
  { id: 's-111', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS011', name: 'AGATHIYAN R', year: 3, section: '2024 BCS', gpa: 7.9, attendance: 82, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 3, wellbeingConcerns: 0, lastMeeting: '19 Jul 2026' },
  { id: 's-112', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS012', name: 'AJAY S', year: 3, section: '2024 BCS', gpa: 8.0, attendance: 85, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 4, wellbeingConcerns: 0, lastMeeting: '22 Jul 2026' },
  { id: 's-113', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS013', name: 'AJAY THARUN S', year: 3, section: '2024 BCS', gpa: 7.3, attendance: 74, standingArrears: 1, meetingsHeld: 3, meetingsDue: 4, readinessDone: 2, wellbeingConcerns: 0, lastMeeting: '15 Jul 2026', flagReason: 'Attendance Shortage', suggestedAction: 'Attendance plan' },
  { id: 's-114', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS014', name: 'AKASH S P', year: 3, section: '2024 BCS', gpa: 7.7, attendance: 80, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 3, wellbeingConcerns: 0, lastMeeting: '23 Jul 2026' },
  { id: 's-115', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS015', name: 'AKASH V', year: 3, section: '2024 BCS', gpa: 8.2, attendance: 87, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 4, wellbeingConcerns: 0, lastMeeting: '24 Jul 2026' },
  { id: 's-116', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS016', name: 'AKHASH BALAKRISHNAN', year: 3, section: '2024 BCS', gpa: 6.9, attendance: 73, standingArrears: 1, meetingsHeld: 2, meetingsDue: 4, readinessDone: 2, wellbeingConcerns: 1, lastMeeting: '04 Jul 2026', flagReason: 'Overdue Meeting', suggestedAction: 'Mentor intervention' },
  { id: 's-117', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS017', name: 'AKHIL KARTTHICK B S', year: 3, section: '2024 BCS', gpa: 8.4, attendance: 89, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 5, wellbeingConcerns: 0, lastMeeting: '25 Jul 2026' },
  { id: 's-118', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS018', name: 'AKSHAYA N', year: 3, section: '2024 BCS', gpa: 8.6, attendance: 91, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 5, wellbeingConcerns: 0, lastMeeting: '24 Jul 2026' },
  { id: 's-119', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS019', name: 'AKSHITA B', year: 3, section: '2024 BCS', gpa: 7.5, attendance: 78, standingArrears: 0, meetingsHeld: 3, meetingsDue: 4, readinessDone: 3, wellbeingConcerns: 0, lastMeeting: '17 Jul 2026', flagReason: 'Overdue Meeting', suggestedAction: 'Schedule review' },
  { id: 's-120', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS020', name: 'ALAMELU T', year: 3, section: '2024 BCS', gpa: 8.8, attendance: 92, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 5, wellbeingConcerns: 0, lastMeeting: '25 Jul 2026' },
  { id: 's-121', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS022', name: 'ALBIN FRANK C J', year: 3, section: '2024 BCS', gpa: 7.1, attendance: 71, standingArrears: 1, meetingsHeld: 3, meetingsDue: 4, readinessDone: 2, wellbeingConcerns: 1, lastMeeting: '11 Jul 2026', flagReason: 'Attendance Shortage', suggestedAction: 'Class advisor review' },
  { id: 's-122', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS023', name: 'AMARNATH SANIL KUMAR', year: 3, section: '2024 BCS', gpa: 7.6, attendance: 80, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 3, wellbeingConcerns: 0, lastMeeting: '20 Jul 2026' },
  { id: 's-123', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS024', name: 'ANEESH D V', year: 3, section: '2024 BCS', gpa: 8.1, attendance: 86, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 4, wellbeingConcerns: 0, lastMeeting: '22 Jul 2026' },
  { id: 's-124', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS025', name: 'APARNA V', year: 3, section: '2024 BCS', gpa: 8.9, attendance: 94, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 6, wellbeingConcerns: 0, lastMeeting: '25 Jul 2026' },
  { id: 's-125', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS026', name: 'ARAVIND KRISHNA R', year: 3, section: '2024 BCS', gpa: 7.4, attendance: 77, standingArrears: 0, meetingsHeld: 3, meetingsDue: 4, readinessDone: 3, wellbeingConcerns: 0, lastMeeting: '16 Jul 2026', flagReason: 'Overdue Meeting', suggestedAction: 'Schedule review' },
  { id: 's-126', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS027', name: 'ARAVIND P', year: 3, section: '2024 BCS', gpa: 7.8, attendance: 83, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 4, wellbeingConcerns: 0, lastMeeting: '21 Jul 2026' },
  { id: 's-127', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS028', name: 'ARUN SANJITH S', year: 3, section: '2024 BCS', gpa: 8.0, attendance: 85, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 4, wellbeingConcerns: 0, lastMeeting: '23 Jul 2026' },
  { id: 's-128', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS029', name: 'ARUNA P', year: 3, section: '2024 BCS', gpa: 7.2, attendance: 69, standingArrears: 1, meetingsHeld: 2, meetingsDue: 4, readinessDone: 2, wellbeingConcerns: 2, lastMeeting: '03 Jul 2026', flagReason: 'Well-being Concern', suggestedAction: 'Counselling referral' },
  { id: 's-129', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS030', name: 'ARUNA SHIVANI R', year: 3, section: '2024 BCS', gpa: 8.3, attendance: 88, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 4, wellbeingConcerns: 0, lastMeeting: '24 Jul 2026' },
  { id: 's-130', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS031', name: 'ARUNKUMAR K', year: 3, section: '2024 BCS', gpa: 7.0, attendance: 74, standingArrears: 1, meetingsHeld: 3, meetingsDue: 4, readinessDone: 2, wellbeingConcerns: 0, lastMeeting: '14 Jul 2026', flagReason: 'Attendance Shortage', suggestedAction: 'Attendance plan' },
  { id: 's-131', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS032', name: 'ARUNKUMAR S', year: 3, section: '2024 BCS', gpa: 7.7, attendance: 81, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 3, wellbeingConcerns: 0, lastMeeting: '19 Jul 2026' },
  { id: 's-132', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS401', name: 'AADHARSH S P', year: 3, section: '2024 BCS', gpa: 8.2, attendance: 86, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 4, wellbeingConcerns: 0, lastMeeting: '22 Jul 2026' },
  { id: 's-133', staffCode: 'KCT01763', mentorId: 'm-1', rollNumber: '24BCS402', name: 'AAMIN ARSATH A', year: 3, section: '2024 BCS', gpa: 7.3, attendance: 76, standingArrears: 0, meetingsHeld: 3, meetingsDue: 4, readinessDone: 3, wellbeingConcerns: 0, lastMeeting: '17 Jul 2026', flagReason: 'Overdue Meeting', suggestedAction: 'Schedule review' },
  { id: 's-134', staffCode: 'KCT01765', mentorId: 'm-2', rollNumber: '24BCS033', name: 'ARVIND A S', year: 3, section: '2024 BCS', gpa: 8.1, attendance: 84, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 4, wellbeingConcerns: 0, lastMeeting: '23 Jul 2026' },
  { id: 's-135', staffCode: 'KCT01765', mentorId: 'm-2', rollNumber: '24BCS034', name: 'ASHMIKA K', year: 3, section: '2024 BCS', gpa: 8.6, attendance: 90, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 5, wellbeingConcerns: 0, lastMeeting: '25 Jul 2026' },
  { id: 's-136', staffCode: 'KCT01765', mentorId: 'm-2', rollNumber: '24BCS035', name: 'ASHUTHOSH RAMESH', year: 3, section: '2024 BCS', gpa: 7.1, attendance: 72, standingArrears: 1, meetingsHeld: 3, meetingsDue: 4, readinessDone: 2, wellbeingConcerns: 1, lastMeeting: '11 Jul 2026', flagReason: 'Attendance Shortage', suggestedAction: 'Advisor follow-up' },
  { id: 's-137', staffCode: 'KCT01765', mentorId: 'm-2', rollNumber: '24BCS036', name: 'ASHWANTH KUMAR', year: 3, section: '2024 BCS', gpa: 7.5, attendance: 78, standingArrears: 0, meetingsHeld: 3, meetingsDue: 4, readinessDone: 3, wellbeingConcerns: 0, lastMeeting: '16 Jul 2026', flagReason: 'Overdue Meeting', suggestedAction: 'Schedule review' },
  { id: 's-138', staffCode: 'KCT01765', mentorId: 'm-2', rollNumber: '24BCS037', name: 'ASWAT D', year: 3, section: '2024 BCS', gpa: 7.9, attendance: 82, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 3, wellbeingConcerns: 0, lastMeeting: '20 Jul 2026' },
  { id: 's-139', staffCode: 'KCT01765', mentorId: 'm-2', rollNumber: '24BCS038', name: 'ASWATHI K', year: 3, section: '2024 BCS', gpa: 8.4, attendance: 89, standingArrears: 0, meetingsHeld: 4, meetingsDue: 4, readinessDone: 5, wellbeingConcerns: 0, lastMeeting: '24 Jul 2026' },
  { id: 's-140', staffCode: 'KCT01765', mentorId: 'm-2', rollNumber: '24BCS039', name: 'ASWATHRAM V', year: 3, section: '2024 BCS', gpa: 7.2, attendance: 73, standingArrears: 1, meetingsHeld: 2, meetingsDue: 4, readinessDone: 2, wellbeingConcerns: 1, lastMeeting: '05 Jul 2026', flagReason: 'Low Attendance', suggestedAction: 'Parent follow-up' },
];
