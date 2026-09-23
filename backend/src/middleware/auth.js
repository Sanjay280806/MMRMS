import { HttpError } from './error.js';
import { findUserById } from '../data/store.js';
import { signAccessToken, verifyAccessToken } from '../lib/token.js';

export function signToken(user) {
  return signAccessToken(user);
}

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query.token) token = req.query.token;
  if (!token) return next(new HttpError(401, 'Missing bearer token', null, 'UNAUTHORIZED'));

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new HttpError(401, 'Invalid or expired token', null, 'UNAUTHORIZED'));
  }

  const user = findUserById(payload.sub);
  if (!user) return next(new HttpError(401, 'User no longer exists', null, 'USER_NOT_FOUND'));

  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, `This endpoint requires role: ${roles.join(' or ')}`, null, 'FORBIDDEN'));
    }
    next();
  };
}
