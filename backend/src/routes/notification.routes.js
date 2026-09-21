import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../data/store.js';

const router = Router();

router.use(requireAuth);

function userRecipient(user) {
  const role = user.role;
  let id = user.id;
  if (role === 'student' && user.studentId) id = user.studentId;
  if (role === 'mentor' && user.mentorId) id = user.mentorId;
  return { id, role };
}

router.get('/', (req, res) => {
  const { id, role } = userRecipient(req.user);
  const items = listNotifications(id, role);
  const unreadCount = items.filter((n) => !n.read).length;
  res.json({ notifications: items, unreadCount });
});

router.patch('/:id/read', (req, res, next) => {
  const { id, role } = userRecipient(req.user);
  const updated = markNotificationRead(id, role, req.params.id);
  if (!updated) {
    return next(new HttpError(404, `Notification ${req.params.id} not found`));
  }
  res.json(updated);
});

router.post('/read-all', (req, res) => {
  const { id, role } = userRecipient(req.user);
  const count = markAllNotificationsRead(id, role);
  res.json({ success: true, count });
});

export default router;
