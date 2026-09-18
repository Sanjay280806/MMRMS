import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Store connected clients: map of userId -> response object
const clients = new Map();

// Store announcement history
const announcementsHistory = [];

router.get('/stream', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.set(req.user.id, res);

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  req.on('close', () => {
    clients.delete(req.user.id);
  });
});

router.post('/broadcast', requireAuth, requireRole('mentor'), (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: { message: 'Message is required' } });
  }

  const announcementObj = {
    id: `ann-${Date.now()}`,
    type: 'announcement',
    message,
    mentorName: req.user.name,
    time: new Date().toISOString()
  };

  announcementsHistory.unshift(announcementObj);

  let sentCount = 0;
  for (const [userId, clientRes] of clients.entries()) {
    // Only send to students
    if (userId !== req.user.id) {
      clientRes.write(`data: ${JSON.stringify(announcementObj)}\n\n`);
      sentCount++;
    }
  }

  res.json({ success: true, data: { sentCount, message: 'Broadcast sent.' } });
});

router.get('/', requireAuth, (req, res) => {
  res.json({ success: true, data: announcementsHistory });
});

export default router;
