import { Router } from 'express';
import { ROLES } from '../data/seed.js';
import { findUserByEmail, publicUser } from '../data/store.js';
import { signToken } from '../middleware/auth.js';
import { signRefreshToken } from '../lib/token.js';
import { HttpError } from '../middleware/error.js';
import {
  getMicrosoftOAuthConfig,
  isMicrosoftOAuthConfigured,
  generateOAuthState,
  getMicrosoftAuthUrl,
  exchangeCodeForTokens,
  getMicrosoftUserProfile,
  decodeJwtPayload,
} from '../services/microsoftAuth.js';

const router = Router();

/**
 * Helper to set standard MMRMS auth cookies.
 */
function setAuthCookies(req, res, accessToken, refreshToken) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';

  res.cookie('mmrms_token', accessToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.cookie('mmrms_refresh', refreshToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/**
 * GET /api/auth/microsoft/config
 * Returns whether Microsoft OAuth is configured and the client details.
 */
router.get('/config', (_req, res) => {
  const config = getMicrosoftOAuthConfig();
  res.json({
    configured: isMicrosoftOAuthConfigured(),
    tenantId: config.tenantId,
    clientId: config.clientId ? `${config.clientId.slice(0, 8)}...` : null,
  });
});

/**
 * GET /api/auth/microsoft/login
 * Starts the Microsoft OAuth 2.0 authorization code flow.
 */
router.get('/login', (req, res, next) => {
  if (!isMicrosoftOAuthConfigured()) {
    return next(new HttpError(503, 'Microsoft OAuth 2.0 is not configured. Please set AZURE_CLIENT_ID and AZURE_CLIENT_SECRET in backend/.env.'));
  }

  const state = generateOAuthState();
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';

  // Store state in an httpOnly cookie for CSRF verification on callback
  res.cookie('mmrms_oauth_state', state, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60 * 1000, // 10 minutes
  });

  const authUrl = getMicrosoftAuthUrl({ state });

  // If format=json was requested, return the URL instead of redirecting
  if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
    return res.json({ authUrl, state });
  }

  res.redirect(authUrl);
});

/**
 * GET /api/auth/microsoft/callback
 * Handles Microsoft's redirect with authorization code.
 */
router.get('/callback', async (req, res) => {
  const config = getMicrosoftOAuthConfig();
  const frontendUrl = config.frontendUrl;

  const { code, state, error, error_description } = req.query;

  // Handle errors from Microsoft
  if (error) {
    const errorMsg = error_description || error;
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMsg)}`);
  }

  // Verify CSRF state cookie if present
  const cookieState = req.cookies?.mmrms_oauth_state;
  if (cookieState && state && cookieState !== state) {
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Invalid OAuth state. Potential CSRF detected.')}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Authorization code missing from Microsoft callback.')}`);
  }

  try {
    const tokens = await exchangeCodeForTokens({ code });
    const profile = await getMicrosoftUserProfile(tokens.access_token);

    // Resolve email address from mail or userPrincipalName or id_token
    const email = (
      profile.mail ||
      profile.userPrincipalName ||
      (tokens.id_token ? decodeJwtPayload(tokens.id_token)?.preferred_username : null) ||
      ''
    ).toLowerCase().trim();

    if (!email) {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('No email address provided by Microsoft account.')}`);
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(`No MMRMS account associated with ${email}. Please sign in with your institutional credentials.`)}`
      );
    }

    if (user.archived) {
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent('This account has been archived. Access is disabled for discontinued staff.')}`
      );
    }

    const accessToken = signToken(user);
    const refreshToken = signRefreshToken(user);

    setAuthCookies(req, res, accessToken, refreshToken);
    res.clearCookie('mmrms_oauth_state');

    // Redirect to frontend with success flag
    return res.redirect(`${frontendUrl}/login?sso_success=true`);
  } catch (err) {
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(err.message || 'OAuth authentication failed')}`);
  }
});

/**
 * POST /api/auth/microsoft/exchange
 * Programmatic code exchange endpoint for SPAs and automated testing.
 */
router.post('/exchange', async (req, res, next) => {
  const { code, redirectUri, state } = req.body ?? {};

  if (!code) {
    return next(new HttpError(400, 'Authorization code is required.'));
  }

  // Validate state if provided and cookie is present
  const cookieState = req.cookies?.mmrms_oauth_state;
  if (cookieState && state && cookieState !== state) {
    return next(new HttpError(400, 'Invalid OAuth state parameter.'));
  }

  try {
    const tokens = await exchangeCodeForTokens({ code, redirectUri });
    const profile = await getMicrosoftUserProfile(tokens.access_token);

    const email = (
      profile.mail ||
      profile.userPrincipalName ||
      (tokens.id_token ? decodeJwtPayload(tokens.id_token)?.preferred_username : null) ||
      ''
    ).toLowerCase().trim();

    if (!email) {
      return next(new HttpError(400, 'Could not determine email address from Microsoft profile.'));
    }

    const user = findUserByEmail(email);
    if (!user) {
      return next(new HttpError(404, `No MMRMS account found for email: ${email}`, null, 'USER_NOT_FOUND'));
    }

    if (user.archived) {
      return next(
        new HttpError(403, 'This account has been archived. Access is disabled for discontinued staff.', null, 'ACCOUNT_ARCHIVED')
      );
    }

    const role = ROLES.find((r) => r.key === user.role);
    const accessToken = signToken(user);
    const refreshToken = signRefreshToken(user);

    setAuthCookies(req, res, accessToken, refreshToken);
    res.clearCookie('mmrms_oauth_state');

    res.json({
      token: accessToken,
      accessToken,
      refreshToken,
      user: publicUser(user),
      role,
      provider: 'microsoft',
    });
  } catch (err) {
    return next(new HttpError(400, err.message || 'Failed to complete Microsoft OAuth exchange.'));
  }
});

export default router;
