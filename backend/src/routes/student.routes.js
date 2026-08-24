import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import {
  acknowledgeGoal,
  addCertification,
  addEvidence,
  addMessage,
  addParticipation,
  addSupportRequest,
  findStudentById,
  updateActionItem,
  updateReadiness,
  updateSelfAssessment,
  updateSkillRating,
} from '../data/store.js';
import { buildStudentRecordBook } from '../services/student.js';
import {
  ACTION_STATUSES,
  CERTIFICATION_STATUSES,
  EXTRA_CURRICULAR_CATEGORIES,
  READINESS_ITEMS,
  READINESS_STATUSES,
  SKILL_ITEMS,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
} from '../data/seed.js';

const router = Router();

router.use(requireAuth, requireRole('student'));

function currentStudent(req) {
  const student = findStudentById(req.user.studentId);
  if (!student) throw new HttpError(404, 'No student record linked to this account');
  return student;
}

const oneOf = (value, allowed, label) => {
  if (!allowed.includes(value)) throw new HttpError(400, `${label} must be one of: ${allowed.join(', ')}`);
};

const EVIDENCE_AREAS = ['participation', 'certifications', 'placement', 'internship'];
const MAX_EVIDENCE_BYTES = 4 * 1024 * 1024;

/** The whole record book. */
router.get('/me/record-book', (req, res) => {
  res.json(buildStudentRecordBook(currentStudent(req)));
});

/* ── Section 1C — the student's own skill ratings ───────────────────────── */
router.patch('/me/skills/:skill', (req, res, next) => {
  const student = currentStudent(req);
  const skill = decodeURIComponent(req.params.skill);
  const rating = Number(req.body?.rating);

  if (!SKILL_ITEMS.includes(skill)) return next(new HttpError(404, `No skill "${skill}"`));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return next(new HttpError(400, 'Rating must be a whole number from 1 to 5'));
  }

  res.json(updateSkillRating(student.id, skill, rating));
});

/* ── Section 1E — Student Self Assessment ───────────────────────────────── */
router.patch('/me/self-assessment', (req, res, next) => {
  const student = currentStudent(req);
  const { strengths, areasForImprovement, challenges } = req.body ?? {};
  const patch = {};
  if (typeof strengths === 'string') patch.strengths = strengths.trim();
  if (typeof areasForImprovement === 'string') patch.areasForImprovement = areasForImprovement.trim();
  if (typeof challenges === 'string') patch.challenges = challenges.trim();

  if (!Object.keys(patch).length) return next(new HttpError(400, 'Nothing to update'));
  res.json(updateSelfAssessment(student.id, patch));
});

/* ── Section 6 — Participation Record ───────────────────────────────────── */
router.post('/me/participation/:group', (req, res, next) => {
  const student = currentStudent(req);
  const { group } = req.params;
  const groups = { technical: 'technical', 'co-curricular': 'coCurricular', 'extra-curricular': 'extraCurricular' };
  const key = groups[group];
  if (!key) return next(new HttpError(404, `Unknown participation group "${group}"`));

  const body = req.body ?? {};

  if (key === 'extraCurricular') {
    if (!body.detail?.trim()) return next(new HttpError(400, 'Detail is required'));
    oneOf(body.category, EXTRA_CURRICULAR_CATEGORIES, 'Category');
    return res.status(201).json(
      addParticipation(student.id, key, {
        category: body.category,
        detail: body.detail.trim(),
        date: body.date?.trim() || 'Jul 2026',
      }),
    );
  }

  if (!body.activity?.trim()) return next(new HttpError(400, 'Activity is required'));
  const entry = {
    activity: body.activity.trim(),
    date: body.date?.trim() || 'Jul 2026',
    achievement: body.achievement?.trim() || '—',
  };
  if (key === 'technical') entry.role = body.role?.trim() || 'Participant';

  res.status(201).json(addParticipation(student.id, key, entry));
});

/* ── Section 7 — Certification Tracker ──────────────────────────────────── */
router.post('/me/certifications', (req, res, next) => {
  const student = currentStudent(req);
  const { certification, platform, status, completionDate } = req.body ?? {};

  if (!certification?.trim()) return next(new HttpError(400, 'Certification name is required'));
  if (!platform?.trim()) return next(new HttpError(400, 'Platform is required'));
  oneOf(status ?? 'Planned', CERTIFICATION_STATUSES, 'Status');

  res.status(201).json(
    addCertification(student.id, {
      certification: certification.trim(),
      platform: platform.trim(),
      status: status ?? 'Planned',
      completionDate: completionDate?.trim() || null,
    }),
  );
});

/* Supporting certificates and files for each growth area. */
router.post('/me/evidence/:area', (req, res, next) => {
  const student = currentStudent(req);
  const area = req.params.area;
  const { name, contentType, size, dataUrl } = req.body ?? {};

  if (!EVIDENCE_AREAS.includes(area)) return next(new HttpError(404, `Unknown evidence area "${area}"`));
  if (!name?.trim() || !contentType?.trim() || typeof dataUrl !== 'string') {
    return next(new HttpError(400, 'Choose a file to upload'));
  }
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
    return next(new HttpError(400, 'Upload a PDF, JPG, PNG, or WEBP file'));
  }
  if (!Number.isInteger(size) || size < 1 || size > MAX_EVIDENCE_BYTES || dataUrl.length > MAX_EVIDENCE_BYTES * 1.4) {
    return next(new HttpError(400, 'Files must be smaller than 4 MB'));
  }
  if (!dataUrl.startsWith(`data:${contentType};base64,`)) {
    return next(new HttpError(400, 'The uploaded file is invalid'));
  }

  res.status(201).json(addEvidence(student.id, area, {
    name: name.trim().slice(0, 160), contentType, size, dataUrl,
  }));
});

/* ── Section 8 — Placement Readiness ────────────────────────────────────── */
router.patch('/me/placement-readiness/:item', (req, res, next) => {
  const student = currentStudent(req);
  const item = decodeURIComponent(req.params.item);
  const { status, note } = req.body ?? {};

  if (!READINESS_ITEMS.includes(item)) return next(new HttpError(404, `No readiness item "${item}"`));
  oneOf(status, READINESS_STATUSES, 'Status');

  res.json(updateReadiness(student.id, item, status, note?.trim()));
});

/* ── Section 12 — action items and goals ────────────────────────────────── */
router.patch('/me/action-items/:actionId', (req, res, next) => {
  const student = currentStudent(req);
  oneOf(req.body?.status, ACTION_STATUSES, 'Status');

  const updated = updateActionItem(student.id, req.params.actionId, req.body.status);
  if (!updated) return next(new HttpError(404, `No action item ${req.params.actionId}`));
  res.json(updated);
});

router.post('/me/goals/:goalId/acknowledge', (req, res, next) => {
  const student = currentStudent(req);
  const goal = acknowledgeGoal(student.id, req.params.goalId);
  if (!goal) return next(new HttpError(404, `No goal ${req.params.goalId}`));
  res.json(goal);
});

/* ── support between meetings ───────────────────────────────────────────── */
router.post('/me/support-requests', (req, res, next) => {
  const student = currentStudent(req);
  const { subject, category, priority } = req.body ?? {};

  if (!subject?.trim()) return next(new HttpError(400, 'A request needs a subject'));
  oneOf(category ?? 'Academic', SUPPORT_CATEGORIES, 'Category');
  oneOf(priority ?? 'Medium', SUPPORT_PRIORITIES, 'Priority');

  res.status(201).json(
    addSupportRequest(student.id, {
      subject: subject.trim(),
      category: category ?? 'Academic',
      priority: priority ?? 'Medium',
    }),
  );
});

router.post('/me/messages', (req, res, next) => {
  const student = currentStudent(req);
  const text = req.body?.text?.trim();
  if (!text) return next(new HttpError(400, 'Message text is required'));
  res.status(201).json(addMessage(student.id, text));
});

export default router;
