import jwt from 'jsonwebtoken';

const ACCESS_SECRET  = process.env.ACCESS_SECRET  ?? 'dev-access-secret-mmrms';
const REFRESH_SECRET = process.env.REFRESH_SECRET ?? 'dev-refresh-secret-mmrms';
const ACCESS_TTL     = process.env.ACCESS_TTL     ?? '15m';
const REFRESH_TTL    = process.env.REFRESH_TTL    ?? '7d';

/**
 * Signs a short-lived (15 min) access token.
 * @param {{ id: string, role: string }} user
 * @returns {string}
 */
export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
  });
}

/**
 * Signs a long-lived (7 day) refresh token.
 * @param {{ id: string, role: string }} user
 * @returns {string}
 */
export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
  });
}

/**
 * Verifies an access token. Returns payload or null on failure.
 * @param {string} token
 * @returns {object|null}
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch {
    return null;
  }
}

/**
 * Verifies a refresh token. Returns payload or null on failure.
 * @param {string} token
 * @returns {object|null}
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch {
    return null;
  }
}
