import { verifyAccessToken } from '../lib/token.js';
import { HttpError } from './error.js';
import { findUserById } from '../data/store.js';

/**
 * Verifies the Bearer access token in the Authorization header.
 * Attaches the full user object to req.user on success.
 */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Missing bearer token'));

  const payload = verifyAccessToken(token);
  if (!payload) return next(new HttpError(401, 'Invalid or expired access token'));

  const user = findUserById(payload.sub);
  if (!user) return next(new HttpError(401, 'User no longer exists'));

  req.user = user;
  next();
}

/**
 * Authorization middleware — must run after requireAuth.
 * @param {...string} roles Allowed role keys
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new HttpError(403, `This endpoint requires role: ${roles.join(' or ')}`),
      );
    }
    next();
  };
}
