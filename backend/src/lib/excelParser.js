import * as XLSX from 'xlsx';

/**
 * Common column header aliases for academic datasets (e.g. MyCamu ERP, Anna University, KCT).
 */
const COLUMN_ALIASES = {
  rollNumber: [
    'roll_number', 'roll_no', 'rollnumber', 'rollno', 'reg_no', 'regno',
    'regn_no', 'regnno', 'regn', 'register_number', 'registerno',
    'registration_number', 'registration_no', 'register_no', 'reg_number',
    'roll', 'student_id', 'id'
  ],
  regNumber: [
    'regn_no', 'regnno', 'regn', 'register_number', 'registerno',
    'registration_number', 'registration_no', 'register_no', 'reg_number', 'reg_no', 'regno'
  ],
  name: [
    'name', 'student_name', 'studentname', 'full_name', 'fullname', 'candidate_name',
    'learner_name', 'name_of_the_professor', 'professor_name'
  ],
  department: [
    'department', 'dept', 'branch', 'discipline', 'dept_name', 'department_of_cse',
    'offering_department', 'timetable_department'
  ],
  programme: [
    'programme', 'program', 'degree', 'course_program', 'branch_name', 'program_id',
    'student_program', 'degree_name'
  ],
  year: [
    'year', 'academic_year', 'study_year', 'current_year', 'acadmic_year', 'year_level'
  ],
  semester: [
    'semester', 'sem', 'current_sem', 'term'
  ],
  section: [
    'section', 'sec', 'class', 'class_name', 'batch_section'
  ],
  mentorEmail: [
    'mentor_email', 'mentoremail', 'mentor_mail', 'faculty_email', 'guide_email',
    'mailid', 'mail_id'
  ],
  staffCode: [
    'staff_code', 'staffcode', 'faculty_code', 'staff_id', 'faculty_id', 'mentor_code',
    'employee_code', 'employeecode', 'emp_code', 'empcode'
  ],
  mentorName: [
    'mentor_name', 'mentorname', 'mentor', 'faculty_name', 'guide_name', 'assigned_mentor',
    'name_of_the_professor', 'professor_name', 'staff_name'
  ],
  designation: [
    'designation', 'post', 'role', 'faculty_designation', 'position', 'designation_name'
  ],
  staffDetails: [
    'staff_details', 'faculty_details', 'staff', 'faculty', 'teacher'
  ],
  courseCode: [
    'course_code', 'subject_code', 'paper_code', 'course', 'course_description'
  ],
  courseName: [
    'course_name', 'subject_name', 'paper_name', 'subject'
  ],
  hoursConducted: [
    'no_of_hours_conducted', 'hours_conducted', 'conducted_hours', 'conducted'
  ],
  hoursAttended: [
    'no_of_hours_attended', 'hours_attended', 'attended_hours', 'attended'
  ],
  gpa: [
    'cgpa', 'gpa', 'sgpa', 'current_cgpa', 'overall_gpa', 'cumulative_gpa', 'marks_gpa'
  ],
  attendance: [
    'attendance', 'attendance_%', 'attendance_pct', 'attendance_percentage',
    'overall_attendance', 'total_attendance', 'att_pct', 'attendance_percent',
    'internal_attendance_percentage', 'internal_attendance_percent', 'internal_attendance_%'
  ],
  standingArrears: [
    'standing_arrears', 'arrears', 'backlogs', 'current_arrears', 'arrear_count',
    'no_of_arrears', 'standing_backlogs', 'active_arrears'
  ],
  dateOfBirth: [
    'dob', 'date_of_birth', 'birth_date', 'birthdate'
  ],
  email: [
    'email', 'student_email', 'mail_id', 'email_id', 'institutional_email', 'mailid'
  ],
  mobile: [
    'mobile', 'phone', 'contact', 'mobile_no', 'phone_number', 'student_mobile'
  ],
};

/**
 * Normalizes an arbitrary header string by removing symbols and converting to lower_snake_case.
 */
export function cleanHeader(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Matches a raw column header to our canonical schema key.
 */
export function mapHeaderToKey(header) {
  const cleaned = cleanHeader(header);
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (cleaned === key.toLowerCase() || aliases.includes(cleaned)) {
      return key;
    }
  }
  return cleaned;
}

const HEADER_HINT_TOKENS = [
  'roll', 'reg', 'regn', 'student', 'name', 'course', 'sem', 'credit',
  'hour', 'attend', 'absent', 'leave', 'duty', 'mark', 'gpa', 'cgpa',
  'staff', 'mentor', 'dept', 'program', 's_no', 'sno', 'employee',
  'professor', 'faculty', 'designation', 'mail', 'mailid'
];

/**
 * Automatically locates the real header row index (handling institutional banner/metadata titles).
 */
export function findHeaderRowIndex(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return 0;
  let bestIdx = 0;
  let bestScore = 0;
  const maxScan = Math.min(rawRows.length, 35);
  for (let i = 0; i < maxScan; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    let score = 0;
    for (const cell of row) {
      const cleaned = cleanHeader(cell);
      if (!cleaned) continue;
      if (HEADER_HINT_TOKENS.some((token) => cleaned.includes(token))) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestScore >= 2 ? bestIdx : 0;
}

/**
 * Detects if the dataset contains course-by-course attendance logs or enrollment registrations (multiple rows per student),
 * and aggregates them into clean student-level records with overall attendance % and shortage subjects.
 */
function aggregateCourseRowsIfApplicable(dataRows) {
  if (!Array.isArray(dataRows) || dataRows.length === 0) return dataRows;

  // Count occurrences of roll numbers
  const rollCounts = new Map();
  for (const row of dataRows) {
    const roll = String(row.regNumber || row.regn_no || row.rollNumber || row.roll_no || row.reg_no || '').trim().toUpperCase();
    if (roll) {
      rollCounts.set(roll, (rollCounts.get(roll) || 0) + 1);
    }
  }

  // Check if at least some students appear in multiple course rows
  const multiCourseStudents = Array.from(rollCounts.values()).filter((c) => c > 1).length;
  const isCourseReport = multiCourseStudents > 0;

  if (!isCourseReport) {
    return dataRows;
  }

  const aggregatedMap = new Map();
  for (const row of dataRows) {
    const roll = String(row.regNumber || row.regn_no || row.rollNumber || row.roll_no || row.reg_no || '').trim().toUpperCase();
    if (!roll) continue;

    if (!aggregatedMap.has(roll)) {
      aggregatedMap.set(roll, {
        _rowIndex: row._rowIndex,
        rollNumber: roll,
        name: String(row.name || '').trim(),
        programme: String(row.programme || row.department || '').trim(),
        semester: row.semester,
        section: row.section || '',
        email: row.email || row.mailid || '',
        totalConducted: 0,
        totalAttended: 0,
        coursePercentages: [],
        courses: [],
        shortageSubjects: [],
        staffDetails: row.staffDetails || row.mentorName || '',
        staffCode: row.staffCode || '',
        mentorName: row.mentorName || row.staffDetails || '',
        gpa: row.gpa,
        standingArrears: row.standingArrears,
      });
    }

    const item = aggregatedMap.get(roll);
    if (!item.name && row.name) item.name = String(row.name).trim();
    if (!item.programme && (row.programme || row.department)) {
      item.programme = String(row.programme || row.department).trim();
    }
    if (!item.section && row.section) item.section = String(row.section).trim();
    if (!item.email && (row.email || row.mailid)) item.email = String(row.email || row.mailid).trim();
    if (!item.staffDetails && (row.staffDetails || row.mentorName)) {
      item.staffDetails = row.staffDetails || row.mentorName;
    }
    if (!item.staffCode && row.staffCode) item.staffCode = String(row.staffCode).trim();
    if (!item.mentorName && row.mentorName) item.mentorName = String(row.mentorName).trim();

    const courseTitle = String(row.courseName || row.courseCode || '').trim();
    if (courseTitle && !item.courses.includes(courseTitle)) {
      item.courses.push(courseTitle);
    }

    const conducted = parseFloat(String(row.hoursConducted).replace(/[^\d.]/g, '')) || 0;
    const attended = parseFloat(String(row.hoursAttended).replace(/[^\d.]/g, '')) || 0;
    const attPct = parseFloat(String(row.attendance).replace(/[^\d.]/g, ''));

    item.totalConducted += conducted;
    item.totalAttended += attended;

    if (!isNaN(attPct)) {
      item.coursePercentages.push(attPct);
      if (attPct < 75 && courseTitle) {
        item.shortageSubjects.push(courseTitle);
      }
    }
  }

  const result = [];
  for (const item of aggregatedMap.values()) {
    let overallAttendance = 85;
    if (item.totalConducted > 0) {
      overallAttendance = Math.round((item.totalAttended / item.totalConducted) * 100);
    } else if (item.coursePercentages.length > 0) {
      const sum = item.coursePercentages.reduce((a, b) => a + b, 0);
      overallAttendance = Math.round(sum / item.coursePercentages.length);
    }

    result.push({
      _rowIndex: item._rowIndex,
      rollNumber: item.rollNumber,
      name: item.name,
      programme: item.programme,
      section: item.section,
      email: item.email,
      attendance: Math.min(100, Math.max(0, overallAttendance)),
      shortageSubjects: item.shortageSubjects,
      courses: item.courses,
      staffDetails: item.staffDetails,
      staffCode: item.staffCode,
      mentorName: item.mentorName || item.staffDetails,
      gpa: item.gpa,
      standingArrears: item.standingArrears,
    });
  }

  return result;
}

/**
 * Parses raw buffer or base64 into a sheet JSON array.
 */
export function parseSpreadsheetBuffer(buffer, sheetName = null) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const targetSheet = sheetName && workbook.Sheets[sheetName]
    ? sheetName
    : workbook.SheetNames[0];

  const worksheet = workbook.Sheets[targetSheet];
  if (!worksheet) return { rows: [], headers: [], sheetNames: workbook.SheetNames };

  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (rawRows.length < 2) {
    return { rows: [], headers: [], sheetNames: workbook.SheetNames };
  }

  // Automatically find header row (handles top title / institutional banner rows)
  const headerIdx = findHeaderRowIndex(rawRows);
  const rawHeaders = rawRows[headerIdx].map((h) => String(h || '').trim());
  const headerMap = rawHeaders.map(mapHeaderToKey);

  const rawDataRows = [];
  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    // Skip empty lines
    if (!rawRow || rawRow.every((val) => val === '' || val === null || val === undefined)) {
      continue;
    }

    const obj = {};
    for (let j = 0; j < headerMap.length; j++) {
      const key = headerMap[j];
      const val = rawRow[j];
      if (key) {
        obj[key] = val !== undefined ? val : '';
      }
    }
    rawDataRows.push({ _rowIndex: i + 1, ...obj });
  }

  // Check if course-wise rows should be aggregated into student summary rows
  const rows = aggregateCourseRowsIfApplicable(rawDataRows);

  return {
    sheetNames: workbook.SheetNames,
    activeSheet: targetSheet,
    headers: rawHeaders,
    mappedKeys: headerMap,
    rows,
    rawRowCount: rawDataRows.length,
    isCourseWise: rows.length < rawDataRows.length && rawDataRows.length > 0,
  };
}

/**
 * Validates and sanitizes a single row according to MMRMS student rules.
 * Intelligently supports both complete student enrollments and partial updates
 * (e.g. attendance-only or arrear-only dumps from ERP).
 */
export function sanitizeStudentRow(row, existingMentors = [], existingStudentsMap = new Map()) {
  const errors = [];
  const warnings = [];

  // Prefer alphanumeric University Register Number (e.g. 26SCS001, 24BCS001) over internal sequential numeric ID (e.g. 21794)
  let rollNumber = String(
    row.regNumber || row.regn_no || row.reg_no || row.regno || row.regn || ''
  ).trim().toUpperCase();
  if (!rollNumber || /^\d+$/.test(rollNumber)) {
    const altRoll = String(
      row.rollNumber || row.roll_number || row.roll_no || row.rollno || ''
    ).trim().toUpperCase();
    if (altRoll && !/^\d+$/.test(altRoll)) {
      rollNumber = altRoll;
    } else if (!rollNumber) {
      rollNumber = altRoll;
    }
  }
  if (!rollNumber) {
    errors.push({ field: 'rollNumber', message: 'Roll number is required' });
  }

  const isExisting = rollNumber ? existingStudentsMap.has(rollNumber) : false;
  const existingStudent = isExisting ? existingStudentsMap.get(rollNumber) : null;

  let name = String(row.name || row.studentName || row.student_name || '').trim();
  if (!name && existingStudent) {
    name = existingStudent.name;
  }
  if (!name && !isExisting) {
    errors.push({ field: 'name', message: 'Student name is required for new student enrollment' });
  }

  // CGPA validation: if omitted in row, keep existing student CGPA or default 7.5
  let gpa = existingStudent ? (existingStudent.gpa || existingStudent.cgpa || 7.5) : 7.5;
  if (row.gpa !== undefined && row.gpa !== '' && row.gpa !== null) {
    const parsedGpa = parseFloat(String(row.gpa).replace(/[^\d.]/g, ''));
    if (isNaN(parsedGpa) || parsedGpa < 0 || parsedGpa > 10) {
      errors.push({ field: 'gpa', message: `CGPA must be a number between 0.0 and 10.0 (got '${row.gpa}')` });
    } else {
      gpa = Number(parsedGpa.toFixed(1));
    }
  }

  // Attendance validation: if omitted in row, keep existing student attendance or default 85
  let attendance = existingStudent ? (existingStudent.attendance ?? 85) : 85;
  if (row.attendance !== undefined && row.attendance !== '' && row.attendance !== null) {
    const parsedAtt = parseFloat(String(row.attendance).replace(/[^\d.]/g, ''));
    if (isNaN(parsedAtt) || parsedAtt < 0 || parsedAtt > 100) {
      errors.push({ field: 'attendance', message: `Attendance % must be between 0 and 100 (got '${row.attendance}')` });
    } else {
      attendance = Math.round(parsedAtt);
    }
  }

  // Standing Arrears validation: if omitted in row, keep existing student arrears or default 0
  let standingArrears = existingStudent ? (existingStudent.standingArrears ?? 0) : 0;
  if (row.standingArrears !== undefined && row.standingArrears !== '' && row.standingArrears !== null) {
    const parsedArr = parseInt(String(row.standingArrears).replace(/[^\d]/g, ''), 10);
    if (isNaN(parsedArr) || parsedArr < 0) {
      errors.push({ field: 'standingArrears', message: `Standing arrears must be a positive integer (got '${row.standingArrears}')` });
    } else {
      standingArrears = parsedArr;
    }
  }

  // Year validation
  let year = existingStudent ? (existingStudent.year || 3) : 3;
  if (row.year !== undefined && row.year !== '' && row.year !== null) {
    const parsedYear = parseInt(String(row.year).replace(/[^\d]/g, ''), 10);
    if (!isNaN(parsedYear) && parsedYear >= 1 && parsedYear <= 4) {
      year = parsedYear;
    }
  }

  // Section / programme detection
  const section = String(
    row.section || (existingStudent ? existingStudent.section : (row.programme ? String(row.programme).replace(/^B\.TECH-?\s*|^B\.E\.?\s*/i, '').trim().substring(0, 15) : '2024 BCS'))
  ).trim();

  // Mentor matching: if omitted in row, keep existing student mentor assignment
  let matchedMentor = null;
  const mentorEmail = String(row.mentorEmail || '').trim().toLowerCase();
  let staffCode = String(row.staffCode || row.employee_code || row.staff_code || row.emp_code || '').trim().toUpperCase();
  let mentorName = String(row.mentorName || row.staff_name || row.staffName || row.facultyName || row.faculty_name || '').trim().toLowerCase();
  const rawStaff = String(row.staffDetails || '').trim();

  // Flag indicating if mentor was explicitly designated in a master roster (rather than a course handler in attendance dump)
  const isExplicitMentorField = Boolean(
    row.mentorEmail || row.mentor_email || row.assigned_mentor || (row.mentorName && !rawStaff)
  );

  if (rawStaff && (!staffCode || !mentorName)) {
    const match = rawStaff.match(/([A-Za-z0-9]+)\s*-\s*([^,]+)/);
    if (match) {
      if (!staffCode) staffCode = match[1].trim().toUpperCase();
      if (!mentorName) mentorName = match[2].trim().toLowerCase();
    }
  }

  const normCode = (c) => String(c || '').trim().toUpperCase().replace(/^K(?=\d)/, 'KCT');

  if (mentorEmail) {
    matchedMentor = existingMentors.find((m) => m.email.toLowerCase() === mentorEmail);
  }
  if (!matchedMentor && staffCode) {
    const targetNorm = normCode(staffCode);
    matchedMentor = existingMentors.find((m) => m.staffCode && normCode(m.staffCode) === targetNorm);
  }
  if (!matchedMentor && mentorName) {
    matchedMentor = existingMentors.find((m) => m.name && m.name.toLowerCase().includes(mentorName));
  }

  if (!matchedMentor) {
    if (existingStudent) {
      matchedMentor = existingMentors.find((m) => m.id === existingStudent.mentorId) || {
        id: existingStudent.mentorId,
        staffCode: existingStudent.staffCode,
        name: 'Bharathi Priya',
        email: 'bharathi.priya@kct.ac.in',
      };
    } else if (existingMentors.length > 0) {
      matchedMentor = existingMentors[0];
      if (isExplicitMentorField) {
        warnings.push({
          field: 'mentor',
          message: `Mentor '${mentorEmail || mentorName}' not found. Defaulted to ${matchedMentor.name}`,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    isExisting,
    errors,
    warnings,
    data: {
      rollNumber,
      name,
      year,
      section,
      gpa,
      attendance,
      standingArrears,
      shortageSubjects: row.shortageSubjects || [],
      courses: row.courses || [],
      mentorId: matchedMentor?.id ?? 'm-1',
      staffCode: matchedMentor?.staffCode ?? 'KCT01763',
      mentorName: matchedMentor?.name ?? 'Bharathi Priya',
      mentorEmail: matchedMentor?.email ?? 'bharathi.priya@kct.ac.in',
      email: (row.email || row.mailid) ? String(row.email || row.mailid).trim() : `${rollNumber.toLowerCase()}@kct.ac.in`,
      dateOfBirth: row.dateOfBirth ? String(row.dateOfBirth).trim() : '15 Jun 2006',
      mobile: row.mobile ? String(row.mobile).trim() : '+91 98400 00000',
    },
  };
}

/**
 * Validates and sanitizes a single row for Faculty & Mentor onboarding (e.g. FACULTY DETAILS.xlsx).
 */
export function sanitizeFacultyRow(row, existingMentors = []) {
  const errors = [];
  const warnings = [];

  const staffCode = String(
    row.staffCode || row.employee_code || row.staff_code || row.emp_code || ''
  ).trim().toUpperCase();

  if (!staffCode) {
    errors.push({ field: 'staffCode', message: 'Employee / Staff code is required' });
  }

  const name = String(
    row.name || row.mentorName || row.name_of_the_professor || row.faculty_name || row.professor_name || ''
  ).trim();

  if (!name) {
    errors.push({ field: 'name', message: 'Faculty / Professor name is required' });
  }

  const email = String(
    row.email || row.mentorEmail || row.mailid || row.mail_id || (staffCode ? `${staffCode.toLowerCase()}@kct.ac.in` : '')
  ).trim().toLowerCase();

  if (!email) {
    errors.push({ field: 'email', message: 'Email ID is required for faculty' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    warnings.push({ field: 'email', message: `Email format '${email}' might be non-standard` });
  }

  const rawDesig = String(row.designation || 'Assistant Professor').trim();
  const designation = rawDesig.toUpperCase().includes('PROFESSOR')
    ? rawDesig
    : `Assistant Professor · ${rawDesig}`;

  const rawDept = String(row.department || 'Computer Science and Engineering').trim();
  const department = rawDept.toLowerCase().includes('cse') || rawDept.toLowerCase().includes('computer')
    ? 'Computer Science and Engineering'
    : rawDept;

  const isExisting = existingMentors.some(
    (m) => (m.staffCode && m.staffCode.toUpperCase() === staffCode) ||
           (m.email && m.email.toLowerCase() === email)
  );

  return {
    isValid: errors.length === 0,
    isExisting,
    errors,
    warnings,
    data: {
      staffCode,
      name,
      email,
      designation,
      department,
      cabin: row.cabin || 'CSE Block · Faculty Cabin',
      mobile: row.mobile || '+91 98430 00000',
    },
  };
}

/**
 * Builds downloadable Excel Workbook for standard student & faculty dataset templates.
 */
export function generateTemplateWorkbook(type = 'master') {
  const wb = XLSX.utils.book_new();

  if (type === 'faculty') {
    const sampleData = [
      {
        'EMPLOYEE CODE': 'KCT00175',
        'Name Of the Professor': 'Dr.E.A.Vimal',
        'Designation': 'ASSOCIATE PROFESSOR',
        'Mailid': 'vimal.ea.cse@kct.ac.in',
        'Department': 'Computer Science and Engineering',
      },
      {
        'EMPLOYEE CODE': 'KCT00106',
        'Name Of the Professor': 'Dr.N.Suganthi',
        'Designation': 'PROFESSOR',
        'Mailid': 'suganthi.n.it@kct.ac.in',
        'Department': 'Computer Science and Engineering',
      },
      {
        'EMPLOYEE CODE': 'KCT01251',
        'Name Of the Professor': 'Dr.C.Bharathipriya',
        'Designation': 'ASSISTANT PROFESSOR II',
        'Mailid': 'bharathipriya.c.cse@kct.ac.in',
        'Department': 'Computer Science and Engineering',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty_Directory');
  } else if (type === 'attendance') {
    const sampleData = [
      {
        'Roll Number': '24BCS001',
        'Student Name': 'ABHINAV DINESH',
        'Attendance %': 88,
        'CGPA': 8.5,
        'Standing Arrears': 0,
      },
      {
        'Roll Number': '24BCS004',
        'Student Name': 'ABINETHRA G S',
        'Attendance %': 71,
        'CGPA': 7.2,
        'Standing Arrears': 1,
      },
      {
        'Roll Number': '24BCS006',
        'Student Name': 'ABISHAI JARON I',
        'Attendance %': 68,
        'CGPA': 6.8,
        'Standing Arrears': 2,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance_Update');
  } else {
    const sampleData = [
      {
        'Roll Number': '24BCS050',
        'Student Name': 'DHARANESH K',
        'Department': 'Computer Science and Engineering',
        'Programme': 'B.E. Computer Science and Engineering',
        'Year': 3,
        'Section': '2024 BCS',
        'Mentor Email': 'bharathi.priya@kct.ac.in',
        'CGPA': 8.4,
        'Attendance %': 86,
        'Standing Arrears': 0,
        'Date of Birth': '12 Aug 2006',
        'Student Email': 'dharanesh.k@kct.ac.in',
        'Mobile Number': '+91 98421 55678',
      },
      {
        'Roll Number': '24BCS051',
        'Student Name': 'HARISH V',
        'Department': 'Computer Science and Engineering',
        'Programme': 'B.E. Computer Science and Engineering',
        'Year': 3,
        'Section': '2024 BCS',
        'Mentor Email': 'asmitha.shree@kct.ac.in',
        'CGPA': 7.1,
        'Attendance %': 72,
        'Standing Arrears': 1,
        'Date of Birth': '05 Nov 2006',
        'Student Email': 'harish.v@kct.ac.in',
        'Mobile Number': '+91 98422 66789',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Master');
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Builds full exported Excel workbook of all students.
 */
export function generateStudentExportWorkbook(students, mentors = []) {
  const wb = XLSX.utils.book_new();

  const mentorMap = new Map(mentors.map((m) => [m.id, m]));

  const rows = students.map((s) => {
    const mentor = mentorMap.get(s.mentorId);
    return {
      'Roll Number': s.rollNumber,
      'Name': s.name,
      'Year': s.year,
      'Section': s.section,
      'Assigned Mentor': mentor?.name ?? s.mentorName ?? '—',
      'Mentor Email': mentor?.email ?? s.mentorEmail ?? '—',
      'CGPA': s.cgpa || s.gpa || 0,
      'Attendance %': s.attendance || 0,
      'Standing Arrears': s.standingArrears || 0,
      'Health Index': s.health ?? '—',
      'Status Flag': s.flagReason || 'Normal',
      'Meetings Held': s.meetingsHeld ?? 0,
      'Meetings Due': s.meetingsDue ?? 4,
      'Last Review': s.lastMeeting || 'None',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, '2024_BCS_Students');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
