import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import {
  addCoordinatorEvent,
  findMenteeById,
  findYearCoordinatorById,
  updateOdRequestStatus,
} from '../data/store.js';
import { buildMenteeRecordBook } from '../services/mentee.js';
import { buildCoordinatorOverview, buildStudentDirectory } from '../services/oversight.js';

const router = Router();
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
  currentCoordinator(req);
  res.json(buildStudentDirectory(req.query));
});

router.get('/me/students/:studentId', (req, res, next) => {
  currentCoordinator(req);
  const student = findMenteeById(req.params.studentId);
  if (!student) return next(new HttpError(404, 'Student not found in your year'));
  res.json(buildMenteeRecordBook(student));
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

export default router;
