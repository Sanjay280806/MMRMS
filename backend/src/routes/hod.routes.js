import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { findMenteeById, listAllMentees } from '../data/store.js';
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

router.get('/me/cohorts', (_req, res) => {
  res.json(getCohortsSummary());
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

router.get('/me/mentors', (_req, res) => {
  res.json(getHodMentors());
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
