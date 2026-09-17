import { Router } from 'express';
import { ROLES, INSTITUTION } from '../data/seed.js';
import { findUserByEmail, publicUser, verifyPassword } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';
import { signAccessToken, signRefreshToken } from '../lib/token.js';
import { HttpError } from '../middleware/error.js';
import { COOKIE_NAME, COOKIE_OPTS } from './refresh.routes.js';

const router = Router();

/** Failed-attempt counters, keyed by normalised email. Resets on success. */
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
      success: false,
      error: {
        code: 'HTTP_423',
        message: 'Account locked after too many failed attempts.',
        details: {
          lockedUntil: record.lockedUntil,
          retryInSeconds: Math.ceil((record.lockedUntil - Date.now()) / 1000),
        },
      },
      meta: { timestamp: new Date().toISOString(), requestId: req.requestId ?? 'unknown' },
    });
  }

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(user, password)) {
    const prev = (record?.lockedUntil > Date.now() ? record.count : record?.count ?? 0);
    const count = prev + 1;
    if (count >= MAX_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCK_MS;
      attempts.set(key, { count, lockedUntil });
      return res.status(423).json({
        success: false,
        error: {
          code: 'HTTP_423',
          message: 'Account locked after too many failed attempts.',
          details: { lockedUntil, retryInSeconds: Math.ceil(LOCK_MS / 1000) },
        },
        meta: { timestamp: new Date().toISOString(), requestId: req.requestId ?? 'unknown' },
      });
    }
    attempts.set(key, { count, lockedUntil: 0 });
    return next(new HttpError(401, 'Invalid email or password. Please try again.'));
  }

  attempts.delete(key);
  const role         = ROLES.find((r) => r.key === user.role);
  const accessToken  = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Refresh token lives in a httpOnly cookie — never readable by JavaScript.
  res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTS);

  // Access token returned in the response body — client stores in memory only.
  res.json({ accessToken, user: publicUser(user), role });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: publicUser(req.user),
    role: ROLES.find((r) => r.key === req.user.role),
  });
});

export default router;
