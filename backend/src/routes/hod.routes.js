import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import {
  findMenteeById,
  listAllMentees,
  listArchivedStaff,
  listEligibleFaculty,
  reassignMentor,
  reassignYearCoordinator,
} from '../data/store.js';
import { buildMenteeRecordBook } from '../services/mentee.js';
import { summariseMentee } from '../services/mentor.js';
import {
  buildHodOverview,
  getCohortsSummary,
  getHodAtRiskStudents,
  getHodComplianceMatrix,
  getHodMentorDetail,
  getHodMentors,
} from '../services/hod.js';

const router = Router();

router.use(requireAuth, requireRole('hod'));

router.get('/me/overview', (_req, res) => {
  res.json(buildHodOverview());
});

router.get('/me/faculty/eligible', (_req, res) => {
  res.json(listEligibleFaculty());
});

router.get('/me/archived-staff', (_req, res) => {
  res.json(listArchivedStaff());
});

router.get('/me/cohorts', (_req, res) => {
  res.json(getCohortsSummary());
});

router.post('/me/cohorts/:cohortId/reassign-yc', (req, res, next) => {
  const { cohortId } = req.params;
  const { newFaculty, reason } = req.body ?? {};

  if (!newFaculty || !newFaculty.name || !newFaculty.email) {
    return next(new HttpError(400, 'Please select or provide a new faculty member with name and institutional email'));
  }

  try {
    const result = reassignYearCoordinator({
      cohortId,
      newFaculty,
      reason: reason?.trim() || 'Discontinued / Reassigned by HOD',
    });
    res.json(result);
  } catch (err) {
    next(new HttpError(400, err.message));
  }
});

router.post('/me/mentors/reassign', (req, res, next) => {
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
      reason: reason?.trim() || 'Mentor Discontinued / Reassigned by HOD',
    });
    res.json(result);
  } catch (err) {
    next(new HttpError(400, err.message));
  }
});

router.get('/me/cohorts/:cohortId', (req, res, next) => {
  const { cohortId } = req.params;
  const cohorts = getCohortsSummary();
  const cohort = cohorts.find((c) => c.cohortId.toUpperCase() === cohortId.toUpperCase());
  if (!cohort) return next(new HttpError(404, `Cohort "${cohortId}" not found`));

  const prefix = cohort.cohortId.slice(0, 2).toUpperCase();
  const students = listAllMentees()
    .filter((s) => s.rollNumber?.toUpperCase().startsWith(prefix) || s.section?.toLowerCase().includes(cohort.cohortName.toLowerCase()))
    .map(summariseMentee);

  res.json({
    cohort,
    students,
  });
});

router.get('/me/mentors', (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  res.json(getHodMentors(includeArchived));
});

router.get('/me/mentors/:mentorId', (req, res, next) => {
  const detail = getHodMentorDetail(req.params.mentorId);
  if (!detail) return next(new HttpError(404, 'Mentor not found'));
  res.json(detail);
});

router.get('/me/at-risk', (_req, res) => {
  res.json(getHodAtRiskStudents());
});

router.get('/me/compliance', (_req, res) => {
  res.json(getHodComplianceMatrix());
});

router.get('/me/students/:studentId', (req, res, next) => {
  const student = findMenteeById(req.params.studentId);
  if (!student) return next(new HttpError(404, 'Student not found'));
  res.json(buildMenteeRecordBook(student));
});

export default router;
