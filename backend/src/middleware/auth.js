import jwt from 'jsonwebtoken';
import { HttpError } from './error.js';
import { findUserById } from '../data/store.js';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  });
}

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Missing bearer token'));

  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return next(new HttpError(401, 'Invalid or expired token'));
  }

  const user = findUserById(payload.sub);
  if (!user) return next(new HttpError(401, 'User no longer exists'));

  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, `This endpoint requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}
