import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import {
  addCoordinatorEvent,
  bulkUpsertFaculty,
  bulkUpsertMentees,
  findMenteeById,
  findMentorById,
  findYearCoordinatorById,
  listAllMentees,
  listMentees,
  listMentors,
  listUploadHistory,
  reassignMentor,
  updateOdRequestStatus,
} from '../data/store.js';
import { buildMenteeRecordBook } from '../services/mentee.js';
import { buildCoordinatorOverview, buildStudentDirectory } from '../services/oversight.js';
import { buildMentorOverview, summariseMentee } from '../services/mentor.js';
import {
  generateStudentExportWorkbook,
  generateTemplateWorkbook,
  parseSpreadsheetBuffer,
  sanitizeFacultyRow,
  sanitizeStudentRow,
} from '../lib/excelParser.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

const EVENT_TYPES = ['PTM', 'Orientation', 'Review', 'Other'];
const EVENT_STATUSES = ['Planned', 'Scheduled', 'Completed', 'Cancelled'];
const OD_STATUSES = ['Approved', 'Rejected'];

router.use(requireAuth, requireRole('coordinator'));

function currentCoordinator(req) {
  const coordinator = findYearCoordinatorById(req.user.coordinatorId);
  if (!coordinator) throw new HttpError(404, 'No year-coordinator record linked to this account');
  return coordinator;
}

router.get('/me/overview', (req, res) => {
  res.json(buildCoordinatorOverview(currentCoordinator(req)));
});

router.get('/me/students', (req, res) => {
  const coordinator = currentCoordinator(req);
  res.json(buildStudentDirectory(req.query, coordinator));
});

router.get('/me/students/:studentId', (req, res, next) => {
  currentCoordinator(req);
  const student = findMenteeById(req.params.studentId);
  if (!student) return next(new HttpError(404, 'Student not found in your year'));
  res.json(buildMenteeRecordBook(student));
});

router.get('/me/mentors/:mentorId', (req, res, next) => {
  const coordinator = currentCoordinator(req);
  const mentor = findMentorById(req.params.mentorId);
  if (!mentor) return next(new HttpError(404, 'Mentor not found'));

  const cohortFilter = coordinator.cohortId;
  const allMentees = listMentees(mentor.id);
  const mentees = cohortFilter && cohortFilter !== 'ALL'
    ? allMentees.filter((m) => {
        const prefix = cohortFilter.slice(0, 2).toUpperCase();
        return m.rollNumber?.toUpperCase().startsWith(prefix) || m.section?.toLowerCase().includes(cohortFilter.toLowerCase());
      })
    : allMentees;

  res.json({
    mentor: {
      id: mentor.id,
      name: mentor.name,
      email: mentor.email,
      department: mentor.department,
      designation: mentor.designation,
      staffCode: mentor.staffCode,
      cabin: mentor.cabin,
    },
    cohortId: coordinator.cohortId,
    mentees: mentees.map(summariseMentee),
    dashboard: buildMentorOverview(mentor),
  });
});

router.get('/me/mentors/:mentorId/dashboard', (req, res, next) => {
  currentCoordinator(req);
  const mentor = findMentorById(req.params.mentorId);
  if (!mentor) return next(new HttpError(404, 'Mentor not found'));
  res.json(buildMentorOverview(mentor));
});

router.post('/me/mentors/reassign', (req, res, next) => {
  currentCoordinator(req);
  const { departingMentorId, targetMentorId, menteeIds, archiveDepartingMentor, reason } = req.body ?? {};

  if (!departingMentorId || !targetMentorId) {
    return next(new HttpError(400, 'Both departing mentor and target mentor are required'));
  }

  try {
    const result = reassignMentor({
      departingMentorId,
      targetMentorId,
      menteeIds: menteeIds || [],
      archiveDepartingMentor: archiveDepartingMentor !== false,
      reason: reason?.trim() || 'Mentor Discontinued / Reassigned by Year Coordinator',
    });
    res.json(result);
  } catch (err) {
    next(new HttpError(400, err.message));
  }
});

router.post('/me/events', (req, res, next) => {
  const coordinator = currentCoordinator(req);
  const { type, title, date, status, notes } = req.body ?? {};
  if (!EVENT_TYPES.includes(type)) return next(new HttpError(400, 'Invalid event type'));
  if (!title?.trim() || !date?.trim()) return next(new HttpError(400, 'Event title and date are required'));
  if (status && !EVENT_STATUSES.includes(status)) return next(new HttpError(400, 'Invalid event status'));
  res.status(201).json(
    addCoordinatorEvent({
      type,
      title: title.trim(),
      date: date.trim(),
      status: status ?? 'Planned',
      notes: notes?.trim() ?? '',
      owner: coordinator.name,
    }),
  );
});

router.patch('/me/od-requests/:requestId', (req, res, next) => {
  const coordinator = currentCoordinator(req);
  const { status } = req.body ?? {};
  if (!OD_STATUSES.includes(status)) return next(new HttpError(400, 'OD requests can be approved or rejected'));
  const request = updateOdRequestStatus(req.params.requestId, status, coordinator.name);
  if (!request) return next(new HttpError(404, 'OD request not found'));
  res.json(request);
});

/* ── Excel Upload & Bulk Data Management ────────────────────────────────── */

router.get('/me/upload/history', (req, res) => {
  currentCoordinator(req);
  res.json(listUploadHistory());
});

router.get('/me/upload/template', (req, res) => {
  currentCoordinator(req);
  const type = req.query.type === 'faculty' ? 'faculty' : (req.query.type === 'attendance' ? 'attendance' : 'master');
  const filename = type === 'faculty'
    ? 'Faculty_Directory_Template.xlsx'
    : (type === 'attendance' ? 'Attendance_Academic_Template.xlsx' : 'Student_Master_Template.xlsx');
  const buffer = generateTemplateWorkbook(type);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

router.get('/me/export/excel', (req, res) => {
  currentCoordinator(req);
  const mentees = listAllMentees().map(summariseMentee);
  const mentors = listMentors();
  const buffer = generateStudentExportWorkbook(mentees, mentors);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="MMRMS_2024_BCS_Students_Export.xlsx"');
  res.send(buffer);
});

router.post('/me/upload/validate', upload.single('file'), (req, res, next) => {
  currentCoordinator(req);
  try {
    let rows = [];
    let filename = 'spreadsheet.xlsx';
    let rawRowCount = 0;
    let isCourseWise = false;
    let parsedInfo = null;

    if (req.file) {
      filename = req.file.originalname;
      parsedInfo = parseSpreadsheetBuffer(req.file.buffer);
      rows = parsedInfo.rows;
      rawRowCount = parsedInfo.rawRowCount || rows.length;
      isCourseWise = Boolean(parsedInfo.isCourseWise);
    } else if (Array.isArray(req.body?.rows)) {
      rows = req.body.rows;
      filename = req.body.filename || 'data_entry.json';
      rawRowCount = rows.length;
    } else {
      return next(new HttpError(400, 'Please upload an Excel/CSV file or provide rows'));
    }

    if (rows.length === 0) {
      return next(new HttpError(400, 'The uploaded spreadsheet contains no data rows'));
    }

    let mode = req.body?.mode || 'master';
    const isFacultyFile = filename.toLowerCase().includes('faculty') ||
      filename.toLowerCase().includes('professor') ||
      (parsedInfo && parsedInfo.headers.some((h) => /professor|employee.*code|designation|faculty/i.test(h)));

    if (isFacultyFile || mode === 'faculty') {
      mode = 'faculty';
    }

    const existingMentors = listMentors();

    if (mode === 'faculty') {
      const validationResults = rows.map((r, index) => {
        const sanitized = sanitizeFacultyRow(r, existingMentors);
        return {
          rowIndex: r._rowIndex || index + 2,
          ...sanitized,
        };
      });

      const validRows = validationResults.filter((r) => r.isValid);
      const errorRows = validationResults.filter((r) => !r.isValid);
      const newFaculty = validRows.filter((r) => !r.isExisting);
      const updateFaculty = validRows.filter((r) => r.isExisting);

      const allErrors = [];
      const allWarnings = [];

      for (const item of validationResults) {
        for (const err of item.errors) {
          allErrors.push({ row: item.rowIndex, field: err.field, message: err.message });
        }
        for (const warn of item.warnings) {
          allWarnings.push({ row: item.rowIndex, field: warn.field, message: warn.message });
        }
      }

      return res.json({
        success: true,
        filename,
        mode: 'faculty',
        totalRows: rows.length,
        rawRowCount,
        isCourseWise: false,
        validCount: validRows.length,
        errorCount: errorRows.length,
        newCount: newFaculty.length,
        updateCount: updateFaculty.length,
        preview: validRows.slice(0, 10).map((r) => r.data),
        errors: allErrors.slice(0, 50),
        warnings: allWarnings.slice(0, 50),
      });
    }

    const existingStudents = listAllMentees();
    const studentMap = new Map(existingStudents.map((s) => [s.rollNumber.toUpperCase(), s]));

    const validationResults = rows.map((r, index) => {
      const sanitized = sanitizeStudentRow(r, existingMentors, studentMap);
      return {
        rowIndex: r._rowIndex || index + 2,
        ...sanitized,
      };
    });

    const validRows = validationResults.filter((r) => r.isValid);
    const errorRows = validationResults.filter((r) => !r.isValid);
    const newStudents = validRows.filter((r) => !r.isExisting);
    const updateStudents = validRows.filter((r) => r.isExisting);

    const allErrors = [];
    const allWarnings = [];

    for (const item of validationResults) {
      for (const err of item.errors) {
        allErrors.push({ row: item.rowIndex, field: err.field, message: err.message });
      }
      for (const warn of item.warnings) {
        allWarnings.push({ row: item.rowIndex, field: warn.field, message: warn.message });
      }
    }

    res.json({
      success: true,
      filename,
      mode,
      totalRows: rows.length,
      rawRowCount,
      isCourseWise,
      validCount: validRows.length,
      errorCount: errorRows.length,
      newCount: newStudents.length,
      updateCount: updateStudents.length,
      preview: validRows.slice(0, 10).map((r) => r.data),
      errors: allErrors.slice(0, 50),
      warnings: allWarnings.slice(0, 50),
    });
  } catch (err) {
    next(new HttpError(400, `Failed to validate spreadsheet: ${err.message}`));
  }
});

router.post('/me/upload/commit', upload.single('file'), (req, res, next) => {
  const coordinator = currentCoordinator(req);
  try {
    let rows = [];
    let filename = 'spreadsheet.xlsx';
    let rawRowCount = 0;
    let isCourseWise = false;
    let parsedInfo = null;

    if (req.file) {
      filename = req.file.originalname;
      parsedInfo = parseSpreadsheetBuffer(req.file.buffer);
      rows = parsedInfo.rows;
      rawRowCount = parsedInfo.rawRowCount || rows.length;
      isCourseWise = Boolean(parsedInfo.isCourseWise);
    } else if (Array.isArray(req.body?.rows)) {
      rows = req.body.rows;
      filename = req.body.filename || 'data_entry.json';
      rawRowCount = rows.length;
    } else {
      return next(new HttpError(400, 'Please upload an Excel/CSV file or provide rows'));
    }

    if (rows.length === 0) {
      return next(new HttpError(400, 'No rows provided to commit'));
    }

    let mode = req.body?.mode || 'master';
    const isFacultyFile = filename.toLowerCase().includes('faculty') ||
      filename.toLowerCase().includes('professor') ||
      (parsedInfo && parsedInfo.headers.some((h) => /professor|employee.*code|designation|faculty/i.test(h)));

    if (isFacultyFile || mode === 'faculty') {
      mode = 'faculty';
    }

    const existingMentors = listMentors();

    if (mode === 'faculty') {
      const validDataToCommit = [];
      const commitErrors = [];

      rows.forEach((r, index) => {
        const sanitized = sanitizeFacultyRow(r, existingMentors);
        if (sanitized.isValid) {
          validDataToCommit.push(sanitized.data);
        } else {
          commitErrors.push({
            row: r._rowIndex || index + 2,
            errors: sanitized.errors.map((e) => e.message).join('; '),
          });
        }
      });

      if (validDataToCommit.length === 0) {
        return next(new HttpError(400, 'None of the faculty rows passed validation. Nothing was imported.'));
      }

      const result = bulkUpsertFaculty(validDataToCommit, {
        uploadedBy: coordinator.name,
        filename,
      });

      return res.json({
        success: true,
        mode: 'faculty',
        message: `Processed ${validDataToCommit.length} faculty members (${result.insertedCount} new onboarded, ${result.updatedCount} updated).`,
        importedCount: result.insertedCount,
        updatedCount: result.updatedCount,
        totalCommitted: validDataToCommit.length,
        skippedErrorsCount: commitErrors.length,
        skippedErrors: commitErrors.slice(0, 20),
        log: result.log,
      });
    }

    const existingStudents = listAllMentees();
    const studentMap = new Map(existingStudents.map((s) => [s.rollNumber.toUpperCase(), s]));

    const validDataToCommit = [];
    const commitErrors = [];

    rows.forEach((r, index) => {
      const sanitized = sanitizeStudentRow(r, existingMentors, studentMap);
      if (sanitized.isValid) {
        validDataToCommit.push(sanitized.data);
      } else {
        commitErrors.push({
          row: r._rowIndex || index + 2,
          errors: sanitized.errors.map((e) => e.message).join('; '),
        });
      }
    });

    if (validDataToCommit.length === 0) {
      return next(new HttpError(400, 'None of the rows passed validation. Nothing was imported.'));
    }

    const result = bulkUpsertMentees(validDataToCommit, {
      uploadedBy: coordinator.name,
      filename,
      mode,
    });

    res.json({
      success: true,
      mode,
      message: `Processed ${validDataToCommit.length} students (${result.insertedCount} new, ${result.updatedCount} updated).`,
      importedCount: result.insertedCount,
      updatedCount: result.updatedCount,
      totalCommitted: validDataToCommit.length,
      skippedErrorsCount: commitErrors.length,
      skippedErrors: commitErrors.slice(0, 20),
      log: result.log,
    });
  } catch (err) {
    next(new HttpError(500, `Failed to commit upload: ${err.message}`));
  }
});

export default router;
