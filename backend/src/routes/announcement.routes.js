import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

// Store connected clients: map of clientId -> { userId, res }
const clients = new Map();

// Store announcement history
const announcementsHistory = [];

router.get('/stream', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = `${req.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  clients.set(clientId, { userId: req.user.id, res });

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Heartbeat interval to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
      clients.delete(clientId);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(clientId);
  });
});

router.post('/broadcast', requireAuth, requireRole('mentor'), (req, res, next) => {
  const { message } = req.body ?? {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return next(new HttpError(400, 'Message is required'));
  }

  const announcementObj = {
    id: `ann-${Date.now()}`,
    type: 'announcement',
    message: message.trim(),
    mentorName: req.user.name || 'Mentor',
    time: new Date().toISOString(),
  };

  announcementsHistory.unshift(announcementObj);

  let sentCount = 0;
  for (const [clientId, client] of clients.entries()) {
    // Only send to other users (students)
    if (client.userId !== req.user.id) {
      try {
        client.res.write(`data: ${JSON.stringify(announcementObj)}\n\n`);
        sentCount++;
      } catch {
        clients.delete(clientId);
      }
    }
  }

  res.json({
    success: true,
    sentCount,
    message: `Broadcast sent to ${sentCount} connected mentee${sentCount === 1 ? '' : 's'}.`,
    data: {
      sentCount,
      message: `Broadcast sent to ${sentCount} connected mentee${sentCount === 1 ? '' : 's'}.`,
    },
  });
});

router.get('/', requireAuth, (_req, res) => {
  res.json({ success: true, data: announcementsHistory });
});

export default router;
