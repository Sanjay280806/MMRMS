import { Router } from 'express';
import { z } from 'zod';
import { ROLES, INSTITUTION } from '../data/seed.js';
import { findUserByEmail, publicUser, verifyPassword } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';
import { signAccessToken, signRefreshToken } from '../lib/token.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

/** Failed-attempt counters, keyed by email. Resets on a successful sign-in. */
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

router.get('/context', (_req, res) => {
  res.json({ institution: INSTITUTION, roles: ROLES });
});

router.post('/login', validate(loginSchema), (req, res, next) => {
  const { email, password } = req.body ?? {};

  const key = String(email).toLowerCase().trim();
  const record = attempts.get(key);

  if (record?.lockedUntil > Date.now()) {
    return next(new HttpError(423, 'Account locked after too many failed attempts.', {
      lockedUntil: record.lockedUntil,
      retryInSeconds: Math.ceil((record.lockedUntil - Date.now()) / 1000),
    }, 'ACCOUNT_LOCKED'));
  }

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(user, password)) {
    const count = (record?.lockedUntil > Date.now() ? record.count : record?.count ?? 0) + 1;
    if (count >= MAX_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCK_MS;
      attempts.set(key, { count, lockedUntil });
      return next(new HttpError(423, 'Account locked after too many failed attempts.', {
        lockedUntil,
        retryInSeconds: Math.ceil(LOCK_MS / 1000),
      }, 'ACCOUNT_LOCKED'));
    }
    attempts.set(key, { count, lockedUntil: 0 });
    return next(new HttpError(401, 'Invalid email or password. Please try again.', null, 'INVALID_CREDENTIALS'));
  }

  attempts.delete(key);
  const role = ROLES.find((r) => r.key === user.role);
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.cookie('mmrms_refresh', refreshToken, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    accessToken,
    token: accessToken,
    user: publicUser(user),
    role,
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: publicUser(req.user),
    role: ROLES.find((r) => r.key === req.user.role),
  });
});

export default router;
