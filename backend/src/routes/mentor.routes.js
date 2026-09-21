import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { addMentorMeeting, addNotification, findMenteeById, findMentorById, listMentees, updateSupportRequest } from '../data/store.js';
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
import {
  ACTION_STATUSES,
  MEETING_AGENDA_ITEMS,
  MEETING_MODES,
  MEETING_TOPIC_CATEGORIES,
} from '../data/seed.js';

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

  const {
    date,
    durationMinutes,
    mode,
    category,
    agenda,
    agendaNotes,
    topicsDiscussed,
    studentConcerns,
    mentorSuggestions,
    supportRequired,
    actionItems,
    progressSinceLastMeeting,
    goalProgress,
    mentorRemarks,
    studentRemarks,
    nextReviewDate,
    mentorSigned,
    studentSigned,
    photoProofs,
    geotag,
  } = req.body ?? {};
  if (!date?.trim() || !topicsDiscussed?.trim()) {
    return next(new HttpError(400, 'Meeting date and topics discussed are required'));
  }
  if (!Array.isArray(agenda) || !agenda.length || agenda.some((item) => !MEETING_AGENDA_ITEMS.includes(item))) {
    return next(new HttpError(400, `Choose one or more agenda items: ${MEETING_AGENDA_ITEMS.join(', ')}`));
  }
  if (!MEETING_MODES.includes(mode)) return next(new HttpError(400, `Mode must be one of: ${MEETING_MODES.join(', ')}`));
  if (!MEETING_TOPIC_CATEGORIES.includes(category)) {
    return next(new HttpError(400, `Category must be one of: ${MEETING_TOPIC_CATEGORIES.join(', ')}`));
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 240) {
    return next(new HttpError(400, 'Meeting duration must be between 5 and 240 minutes'));
  }

  // Meeting can only be saved if at least one action item is entered
  const validActionItems = (actionItems ?? []).filter((item) => item?.task?.trim());
  if (!validActionItems.length) {
    return next(new HttpError(400, 'At least one action item is required to save the meeting'));
  }

  if (actionItems && (!Array.isArray(actionItems) || actionItems.length > 10 || actionItems.some((item) =>
    !item?.task?.trim() || !['Student', 'Mentor'].includes(item.responsible) ||
    !ACTION_STATUSES.includes(item.status) || (item.targetDate !== '' && typeof item.targetDate !== 'string'),
  ))) {
    return next(new HttpError(400, 'Each action item needs a task, responsible person, target date, and status'));
  }

  // Next review date: strictly future dates only (no past dates or current date)
  if (nextReviewDate?.trim()) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (nextReviewDate.trim() <= todayStr) {
      return next(new HttpError(400, 'Next review date must be a future date (cannot be today or a past date)'));
    }
  }
  if (goalProgress && (!Array.isArray(goalProgress) || goalProgress.length > 10 || goalProgress.some((item) =>
    !item?.goalId?.trim() || !item?.currentStatus?.trim() || !Number.isInteger(item.progress) || item.progress < 0 || item.progress > 100,
  ))) {
    return next(new HttpError(400, 'Each goal update needs a goal, current status, and progress from 0 to 100'));
  }
  if (progressSinceLastMeeting && typeof progressSinceLastMeeting !== 'object') {
    return next(new HttpError(400, 'Progress since the last meeting is invalid'));
  }
  if (photoProofs && (!Array.isArray(photoProofs) || photoProofs.length > 4 || photoProofs.some((photo) =>
    !photo?.name || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.contentType) ||
    typeof photo.dataUrl !== 'string' || !photo.dataUrl.startsWith(`data:${photo.contentType};base64,`) || photo.dataUrl.length > 4 * 1024 * 1024,
  ))) {
    return next(new HttpError(400, 'Upload up to four JPG, PNG, or WEBP photo proofs under 3 MB each'));
  }
  if (geotag && (!Number.isFinite(geotag.latitude) || !Number.isFinite(geotag.longitude))) {
    return next(new HttpError(400, 'The meeting location is invalid'));
  }

  const meeting = addMentorMeeting(mentee.id, {
    date: date.trim(),
    duration: `${durationMinutes} min`,
    mode,
    topicsDiscussed: topicsDiscussed.trim(),
    category,
    agenda,
    agendaNotes: agendaNotes?.trim() ?? '',
    studentConcerns: studentConcerns?.trim() || 'None recorded.',
    mentorSuggestions: mentorSuggestions?.trim() || 'None recorded.',
    supportRequired: supportRequired?.trim() || 'None.',
    progressSinceLastMeeting: {
      achievements: progressSinceLastMeeting?.achievements?.trim() || 'None recorded.',
      pendingTasks: progressSinceLastMeeting?.pendingTasks?.trim() || 'None.',
      improvementObserved: progressSinceLastMeeting?.improvementObserved?.trim() || 'To be reviewed at the next meeting.',
    },
    goalProgress: (goalProgress ?? []).map((item) => ({
      goalId: item.goalId.trim(),
      currentStatus: item.currentStatus.trim(),
      progress: item.progress,
    })),
    mentorRemarks: mentorRemarks?.trim() ?? '',
    studentRemarks: studentRemarks?.trim() ?? '',
    nextReviewDate: nextReviewDate?.trim() ?? '',
    mentorSigned: mentorSigned === true,
    studentSigned: studentSigned === true,
    photoProofs: (photoProofs ?? []).map((photo) => ({
      name: String(photo.name).trim().slice(0, 160),
      contentType: photo.contentType,
      dataUrl: photo.dataUrl,
    })),
    geotag: geotag ? {
      latitude: Number(geotag.latitude.toFixed(6)),
      longitude: Number(geotag.longitude.toFixed(6)),
      accuracy: Number.isFinite(geotag.accuracy) ? Math.round(geotag.accuracy) : null,
      capturedAt: geotag.capturedAt ?? new Date().toISOString(),
    } : null,
    actionItems: (actionItems ?? []).map((item) => ({
      task: item.task.trim(),
      responsible: item.responsible,
      targetDate: item.targetDate || 'Not set',
      status: item.status,
    })),
  });

  addNotification({
    recipientId: mentee.id,
    recipientRole: 'student',
    title: 'Meeting Recorded',
    message: `A mentoring meeting was recorded for ${date.trim()}.`,
    type: 'meeting_recorded',
    link: 'meetings',
  });

  res.status(201).json(meeting);
});

/** Batch Section 12 meetings for multiple selected mentees */
router.post('/me/meetings/batch', (req, res, next) => {
  const mentor = currentMentor(req);
  const { menteeIds, ...meetingData } = req.body ?? {};
  if (!Array.isArray(menteeIds) || !menteeIds.length) {
    return next(new HttpError(400, 'Please select at least one mentee'));
  }

  const {
    date,
    durationMinutes,
    mode,
    category,
    agenda,
    agendaNotes,
    topicsDiscussed,
    studentConcerns,
    mentorSuggestions,
    supportRequired,
    actionItems,
    progressSinceLastMeeting,
    goalProgress,
    mentorRemarks,
    studentRemarks,
    nextReviewDate,
    mentorSigned,
    studentSigned,
    photoProofs,
    geotag,
  } = meetingData;

  if (!date?.trim() || !topicsDiscussed?.trim()) {
    return next(new HttpError(400, 'Meeting date and topics discussed are required'));
  }

  const validActionItems = (actionItems ?? []).filter((item) => item?.task?.trim());
  if (!validActionItems.length) {
    return next(new HttpError(400, 'At least one action item is required to save the meeting'));
  }

  if (nextReviewDate?.trim()) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (nextReviewDate.trim() <= todayStr) {
      return next(new HttpError(400, 'Next review date must be a future date (cannot be today or a past date)'));
    }
  }

  const createdMeetings = [];
  for (const menteeId of menteeIds) {
    const mentee = findMenteeById(menteeId);
    if (!mentee || mentee.mentorId !== mentor.id) continue;
    const meeting = addMentorMeeting(mentee.id, {
      date: date.trim(),
      duration: `${durationMinutes} min`,
      mode,
      topicsDiscussed: topicsDiscussed.trim(),
      category,
      agenda,
      agendaNotes: agendaNotes?.trim() ?? '',
      studentConcerns: studentConcerns?.trim() || 'None recorded.',
      mentorSuggestions: mentorSuggestions?.trim() || 'None recorded.',
      supportRequired: supportRequired?.trim() || 'None.',
      progressSinceLastMeeting: {
        achievements: progressSinceLastMeeting?.achievements?.trim() || 'None recorded.',
        pendingTasks: progressSinceLastMeeting?.pendingTasks?.trim() || 'None.',
        improvementObserved: progressSinceLastMeeting?.improvementObserved?.trim() || 'To be reviewed at the next meeting.',
      },
      goalProgress: (goalProgress ?? []).map((item) => ({
        goalId: item.goalId.trim(),
        currentStatus: item.currentStatus.trim(),
        progress: item.progress,
      })),
      mentorRemarks: mentorRemarks?.trim() ?? '',
      studentRemarks: studentRemarks?.trim() ?? '',
      nextReviewDate: nextReviewDate?.trim() ?? '',
      mentorSigned: mentorSigned === true,
      studentSigned: studentSigned === true,
      photoProofs: (photoProofs ?? []).map((photo) => ({
        name: String(photo.name).trim().slice(0, 160),
        contentType: photo.contentType,
        dataUrl: photo.dataUrl,
      })),
      geotag: geotag ? {
        latitude: Number(geotag.latitude.toFixed(6)),
        longitude: Number(geotag.longitude.toFixed(6)),
        accuracy: Number.isFinite(geotag.accuracy) ? Math.round(geotag.accuracy) : null,
        capturedAt: geotag.capturedAt ?? new Date().toISOString(),
      } : null,
      actionItems: validActionItems.map((item) => ({
        task: item.task.trim(),
        responsible: item.responsible,
        targetDate: item.targetDate || 'Not set',
        status: item.status,
      })),
    });
    addNotification({
      recipientId: mentee.id,
      recipientRole: 'student',
      title: 'Meeting Recorded',
      message: `A mentoring meeting was recorded for ${date.trim()}.`,
      type: 'meeting_recorded',
      link: 'meetings',
    });
    createdMeetings.push(meeting);
  }

  res.status(201).json({ count: createdMeetings.length, meetings: createdMeetings });
});

router.get('/me/support-requests', (req, res) => {
  const mentor = currentMentor(req);
  const mentees = listMentees(mentor.id);
  const requests = [];

  for (const mentee of mentees) {
    for (const reqItem of mentee.supportRequests ?? []) {
      requests.push({
        ...reqItem,
        studentId: mentee.id,
        studentName: mentee.identity?.name ?? mentee.name,
        rollNumber: mentee.identity?.rollNumber ?? mentee.rollNumber,
        department: mentee.identity?.department ?? mentee.department,
        year: mentee.identity?.year ?? mentee.year,
        tone: { Raised: 'amber', 'In Progress': 'indigo', Replied: 'indigo', Resolved: 'green' }[reqItem.status] ?? 'slate',
        priorityTone: { High: 'rose', Medium: 'indigo', Low: 'slate' }[reqItem.priority] ?? 'slate',
      });
    }
  }

  res.json(requests);
});

router.patch('/me/mentees/:menteeId/support-requests/:requestId', (req, res, next) => {
  const mentor = currentMentor(req);
  const mentee = findMenteeById(req.params.menteeId);
  if (!mentee || mentee.mentorId !== mentor.id) {
    return next(new HttpError(404, `No mentee ${req.params.menteeId} assigned to you`));
  }

  const { status, response, message } = req.body ?? {};
  if (status && !['Raised', 'In Progress', 'Replied', 'Resolved'].includes(status)) {
    return next(new HttpError(400, 'Status must be Raised, In Progress, Replied, or Resolved'));
  }

  const updated = updateSupportRequest(mentee.id, req.params.requestId, {
    status,
    response,
    message,
    authorRole: 'mentor',
    authorId: mentor.id,
    authorName: mentor.name,
  });

  if (!updated) {
    return next(new HttpError(404, `Support request ${req.params.requestId} not found`));
  }

  addNotification({
    recipientId: mentee.id,
    recipientRole: 'student',
    title: 'Support Request Updated',
    message: `Your mentor responded to your support request: ${updated.subject}`,
    type: 'ticket_reply',
    link: 'contact',
  });

  res.json({
    ...updated,
    studentId: mentee.id,
    studentName: mentee.identity?.name ?? mentee.name,
    rollNumber: mentee.identity?.rollNumber ?? mentee.rollNumber,
    department: mentee.identity?.department ?? mentee.department,
    year: mentee.identity?.year ?? mentee.year,
    tone: { Raised: 'amber', 'In Progress': 'indigo', Replied: 'indigo', Resolved: 'green' }[updated.status] ?? 'slate',
    priorityTone: { High: 'rose', Medium: 'indigo', Low: 'slate' }[updated.priority] ?? 'slate',
  });
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
