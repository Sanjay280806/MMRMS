import { Router } from 'express';
import { ROLES } from '../data/seed.js';
import { findUserById, publicUser } from '../data/store.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/token.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.post('/refresh', (req, res, next) => {
  const refreshToken = req.cookies?.mmrms_refresh || req.body?.refreshToken;
  if (!refreshToken) {
    return next(new HttpError(401, 'No refresh token provided'));
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload || !payload.sub) {
    return next(new HttpError(401, 'Invalid or expired refresh token'));
  }

  const user = findUserById(payload.sub);
  if (!user) {
    return next(new HttpError(401, 'User no longer exists'));
  }

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  res.cookie('mmrms_refresh', newRefreshToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const role = ROLES.find((r) => r.key === user.role);
  res.json({
    accessToken: newAccessToken,
    token: newAccessToken,
    refreshToken: newRefreshToken,
    user: publicUser(user),
    role,
  });
});

router.post('/logout', (req, res) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  res.clearCookie('mmrms_refresh', {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
  });
  res.json({ success: true, data: null, message: 'Logged out successfully' });
});

export default router;
