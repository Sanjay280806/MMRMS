import jwt from 'jsonwebtoken';

export const ACCESS_SECRET = process.env.ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret';
export const REFRESH_SECRET = process.env.REFRESH_SECRET ?? 'dev-refresh-secret';

const ACCESS_TTL = process.env.ACCESS_TTL ?? '15m';
const REFRESH_TTL = process.env.REFRESH_TTL ?? '7d';

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
  });
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
  });
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch {
    return null;
  }
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}
