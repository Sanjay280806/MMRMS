import { Router } from 'express';
import { ROLES } from '../data/seed.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/token.js';
import { findUserById, publicUser } from '../data/store.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.post('/refresh', (req, res, next) => {
  const token = req.cookies?.mmrms_refresh;
  if (!token) {
    return next(new HttpError(401, 'No refresh token provided', null, 'REFRESH_TOKEN_MISSING'));
  }

  const payload = verifyRefreshToken(token);
  if (!payload || !payload.sub) {
    return next(new HttpError(401, 'Invalid or expired refresh token', null, 'INVALID_REFRESH_TOKEN'));
  }

  const user = findUserById(payload.sub);
  if (!user) {
    return next(new HttpError(401, 'User no longer exists', null, 'USER_NOT_FOUND'));
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const role = ROLES.find((r) => r.key === user.role);

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

router.post('/logout', (_req, res) => {
  res.clearCookie('mmrms_refresh', {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
  res.json(null);
});

export default router;
