import { Router } from 'express';
import { ROLES, INSTITUTION } from '../data/seed.js';
import { findUserByEmail, publicUser, verifyPassword } from '../data/store.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

/** Failed-attempt counters, keyed by email. Resets on a successful sign-in. */
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

router.get('/context', (_req, res) => {
  res.json({ institution: INSTITUTION, roles: ROLES });
});

router.post('/login', (req, res, next) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return next(new HttpError(400, 'Email and password are required'));
  }

  const key = String(email).toLowerCase().trim();
  const record = attempts.get(key);

  if (record?.lockedUntil > Date.now()) {
    return res.status(423).json({
      error: 'Account locked after too many failed attempts.',
      lockedUntil: record.lockedUntil,
      retryInSeconds: Math.ceil((record.lockedUntil - Date.now()) / 1000),
    });
  }

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(user, password)) {
    const count = (record?.lockedUntil > Date.now() ? record.count : record?.count ?? 0) + 1;
    if (count >= MAX_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCK_MS;
      attempts.set(key, { count, lockedUntil });
      return res.status(423).json({
        error: 'Account locked after too many failed attempts.',
        lockedUntil,
        retryInSeconds: Math.ceil(LOCK_MS / 1000),
      });
    }
    attempts.set(key, { count, lockedUntil: 0 });
    return next(new HttpError(401, 'Invalid email or password. Please try again.'));
  }

  attempts.delete(key);
  const role = ROLES.find((r) => r.key === user.role);
  res.json({ token: signToken(user), user: publicUser(user), role });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: publicUser(req.user),
    role: ROLES.find((r) => r.key === req.user.role),
  });
});

export default router;
