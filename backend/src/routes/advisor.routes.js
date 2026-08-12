import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import {
  addClassMeeting,
  addGrievance,
  findClassAdvisorById,
  findMenteeById,
  updateGrievanceStatus,
} from '../data/store.js';
import { buildMenteeRecordBook } from '../services/mentee.js';
import { buildAdvisorOverview, buildStudentDirectory } from '../services/oversight.js';

const router = Router();
const GRIEVANCE_STATUSES = ['Raised', 'In Progress', 'Referred', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High'];

router.use(requireAuth, requireRole('advisor'));

function currentAdvisor(req) {
  const advisor = findClassAdvisorById(req.user.advisorId);
  if (!advisor) throw new HttpError(404, 'No class-advisor record linked to this account');
  return advisor;
}

router.get('/me/overview', (req, res) => {
  res.json(buildAdvisorOverview(currentAdvisor(req)));
});

router.get('/me/students', (req, res) => {
  currentAdvisor(req);
  res.json(buildStudentDirectory(req.query));
});

router.get('/me/students/:studentId', (req, res, next) => {
  currentAdvisor(req);
  const student = findMenteeById(req.params.studentId);
  if (!student) return next(new HttpError(404, 'Student not found in your class'));
  res.json(buildMenteeRecordBook(student));
});

router.post('/me/class-meetings', (req, res, next) => {
  currentAdvisor(req);
  const { title, date, agenda } = req.body ?? {};
  if (!title?.trim() || !date?.trim() || !agenda?.trim()) {
    return next(new HttpError(400, 'Title, date, and agenda are required'));
  }
  res.status(201).json(addClassMeeting({ title: title.trim(), date: date.trim(), agenda: agenda.trim() }));
});

router.post('/me/grievances', (req, res, next) => {
  currentAdvisor(req);
  const { studentId, category, subject, priority } = req.body ?? {};
  if (!findMenteeById(studentId)) return next(new HttpError(404, 'Student not found in your class'));
  if (!subject?.trim()) return next(new HttpError(400, 'A grievance subject is required'));
  if (!['Academic', 'Personal', 'Discipline', 'Administrative'].includes(category ?? 'Academic')) {
    return next(new HttpError(400, 'Invalid grievance category'));
  }
  if (!PRIORITIES.includes(priority ?? 'Medium')) return next(new HttpError(400, 'Invalid grievance priority'));
  res.status(201).json(
    addGrievance({
      studentId,
      category: category ?? 'Academic',
      subject: subject.trim(),
      priority: priority ?? 'Medium',
      raisedOn: 'Just now',
    }),
  );
});

router.patch('/me/grievances/:grievanceId', (req, res, next) => {
  currentAdvisor(req);
  const { status } = req.body ?? {};
  if (!GRIEVANCE_STATUSES.includes(status)) return next(new HttpError(400, 'Invalid grievance status'));
  const grievance = updateGrievanceStatus(req.params.grievanceId, status);
  if (!grievance) return next(new HttpError(404, 'Grievance not found'));
  res.json(grievance);
});

export default router;
