import { Router } from 'express';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '../lib/token.js';
import { findUserById } from '../data/store.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

const COOKIE_NAME = 'mmrms_refresh';
const COOKIE_OPTS = {
  httpOnly:  true,
  sameSite:  'strict',
  path:      '/api/auth',
  secure:    process.env.NODE_ENV === 'production',
  maxAge:    7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

/**
 * POST /api/auth/refresh
 * Reads the httpOnly refresh cookie, verifies it, issues a new
 * access token, and rotates the refresh token (new cookie).
 */
router.post('/refresh', (req, res, next) => {
  const refreshToken = req.cookies?.[COOKIE_NAME];
  if (!refreshToken) {
    return next(new HttpError(401, 'No refresh token — please log in again'));
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    res.clearCookie(COOKIE_NAME, COOKIE_OPTS);
    return next(new HttpError(401, 'Refresh token is invalid or expired — please log in again'));
  }

  const user = findUserById(payload.sub);
  if (!user) {
    res.clearCookie(COOKIE_NAME, COOKIE_OPTS);
    return next(new HttpError(401, 'User no longer exists'));
  }

  // Rotate: issue a fresh refresh token (limits the window of a stolen token)
  const newAccessToken  = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  res.cookie(COOKIE_NAME, newRefreshToken, COOKIE_OPTS);
  res.json({ accessToken: newAccessToken });
});

/**
 * POST /api/auth/logout
 * Clears the httpOnly refresh cookie. The client should discard the
 * access token from memory.
 */
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTS, maxAge: 0 });
  res.json(null);
});

export default router;
export { COOKIE_NAME, COOKIE_OPTS };
