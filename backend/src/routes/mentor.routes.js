import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { addMentorMeeting, findMenteeById, findMentorById, listMentees } from '../data/store.js';
import {
  buildActionItemQueue,
  buildGoalOverview,
  buildMentorOverview,
  buildParentLog,
  buildReports,
  mentorTimeline,
  summariseMentee,
} from '../services/mentor.js';
import { buildMenteeRecordBook } from '../services/mentee.js';

const router = Router();

router.use(requireAuth, requireRole('mentor'));

function currentMentor(req) {
  const mentor = findMentorById(req.user.mentorId);
  if (!mentor) throw new HttpError(404, 'No mentor record linked to this account');
  return mentor;
}

const SORTS = {
  risk: (a, b) => a.health - b.health,
  name: (a, b) => a.name.localeCompare(b.name),
  attendance: (a, b) => a.attendance - b.attendance,
  meetings: (a, b) => b.meetingsOverdue - a.meetingsOverdue,
};

router.get('/me/overview', (req, res) => {
  res.json(buildMentorOverview(currentMentor(req)));
});

router.get('/me/mentees', (req, res, next) => {
  const mentor = currentMentor(req);
  const sort = req.query.sort ?? 'risk';
  if (!SORTS[sort]) return next(new HttpError(400, `sort must be one of: ${Object.keys(SORTS).join(', ')}`));

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 100));
  const search = String(req.query.student ?? req.query.search ?? '').trim().toLowerCase();
  const year = String(req.query.year ?? '').trim();
  const allMentees = listMentees(mentor.id)
    .map(summariseMentee)
    .filter((mentee) => !search || `${mentee.name} ${mentee.rollNumber}`.toLowerCase().includes(search))
    .filter((mentee) => !year || String(mentee.year) === year)
    .sort(SORTS[sort]);
  const total = allMentees.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  res.json({
    total,
    sort,
    page: safePage,
    limit,
    totalPages,
    mentees: allMentees.slice((safePage - 1) * limit, safePage * limit),
  });
});

/** One mentee's full record book — the same payload shape the student sees. */
router.get('/me/mentees/:menteeId', (req, res, next) => {
  const mentor = currentMentor(req);
  const mentee = findMenteeById(req.params.menteeId);
  if (!mentee || mentee.mentorId !== mentor.id) {
    return next(new HttpError(404, `No mentee ${req.params.menteeId} assigned to you`));
  }
  res.json(buildMenteeRecordBook(mentee));
});

/** Section 12 — write a structured mentoring session and its follow-up. */
router.post('/me/mentees/:menteeId/meetings', (req, res, next) => {
  const mentor = currentMentor(req);
  const mentee = findMenteeById(req.params.menteeId);
  if (!mentee || mentee.mentorId !== mentor.id) {
    return next(new HttpError(404, `No mentee ${req.params.menteeId} assigned to you`));
  }

  const { date, topicsDiscussed, agenda, actionItem, actionOwner, actionDate, nextReviewDate, mentorRemarks } = req.body ?? {};
  if (!date?.trim() || !topicsDiscussed?.trim()) {
    return next(new HttpError(400, 'Meeting date and topics discussed are required'));
  }
  if (agenda && (!Array.isArray(agenda) || agenda.some((item) => typeof item !== 'string' || !item.trim()))) {
    return next(new HttpError(400, 'Agenda must be a list of non-empty topics'));
  }

  const meeting = addMentorMeeting(mentee.id, {
    date: date.trim(),
    topicsDiscussed: topicsDiscussed.trim(),
    agenda: agenda?.map((item) => item.trim()) ?? ['Academic Review'],
    mentorRemarks: mentorRemarks?.trim() ?? '',
    nextReviewDate: nextReviewDate?.trim() ?? '',
    actionItems: actionItem?.trim()
      ? [{ task: actionItem.trim(), responsible: actionOwner === 'Mentor' ? 'Mentor' : 'Student', targetDate: actionDate?.trim() || 'To be scheduled' }]
      : [],
  });
  res.status(201).json(meeting);
});

router.get('/me/goals', (req, res) => {
  res.json(buildGoalOverview(currentMentor(req)));
});

router.get('/me/action-items', (req, res) => {
  res.json(buildActionItemQueue(currentMentor(req)));
});

router.get('/me/parent-log', (req, res) => {
  res.json(buildParentLog(currentMentor(req)));
});

router.get('/me/reports', (req, res) => {
  res.json(buildReports(currentMentor(req)));
});

router.get('/me/timeline', (req, res) => {
  res.json(mentorTimeline(currentMentor(req)));
});

export default router;
