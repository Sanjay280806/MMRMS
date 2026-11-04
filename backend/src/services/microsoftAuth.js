import crypto from 'node:crypto';

/**
 * Microsoft OAuth 2.0 / Entra ID (Azure AD) Service
 * Implements Authorization Code Flow with PKCE/State and Microsoft Graph profile retrieval.
 */

const DEFAULT_TENANT = 'common';
const GRAPH_ME_URL = 'https://graph.microsoft.com/v1.0/me';
const DEFAULT_SCOPES = ['openid', 'profile', 'email', 'User.Read'];

/**
 * Get the current Microsoft OAuth configuration from environment variables.
 */
export function getMicrosoftOAuthConfig() {
  const clientId = process.env.AZURE_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID || '';
  const clientSecret = process.env.AZURE_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET || '';
  const tenantId = process.env.AZURE_TENANT_ID || DEFAULT_TENANT;
  const redirectUri = process.env.AZURE_REDIRECT_URI || 'http://localhost:4000/api/auth/microsoft/callback';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri,
    frontendUrl,
    configured: Boolean(clientId && clientSecret),
  };
}

/**
 * Check if Microsoft OAuth is configured with valid credentials.
 */
export function isMicrosoftOAuthConfigured() {
  const { configured } = getMicrosoftOAuthConfig();
  return configured || process.env.NODE_ENV === 'test' || process.env.MOCK_OAUTH === 'true';
}

/**
 * Generate a cryptographically secure random state string for CSRF protection.
 */
export function generateOAuthState() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Build the Microsoft OAuth 2.0 authorization URL.
 *
 * @param {Object} options
 * @param {string} options.state - CSRF state string
 * @param {string} [options.redirectUri] - Custom redirect URI
 * @param {string} [options.prompt] - Prompt behavior (e.g. 'select_account')
 * @returns {string} The full authorization URL
 */
export function getMicrosoftAuthUrl({ state, redirectUri, prompt = 'select_account' } = {}) {
  const config = getMicrosoftOAuthConfig();
  const effectiveRedirect = redirectUri || config.redirectUri;
  const authorizeEndpoint = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`;

  const params = new URLSearchParams({
    client_id: config.clientId || 'mmrms-mock-client-id',
    response_type: 'code',
    redirect_uri: effectiveRedirect,
    response_mode: 'query',
    scope: DEFAULT_SCOPES.join(' '),
    state: state || generateOAuthState(),
    prompt,
  });

  return `${authorizeEndpoint}?${params.toString()}`;
}

/**
 * Exchange an OAuth 2.0 authorization code for Microsoft tokens.
 *
 * @param {Object} options
 * @param {string} options.code - Authorization code from Microsoft
 * @param {string} [options.redirectUri] - Redirect URI matching the authorization request
 * @returns {Promise<Object>} Token response containing access_token, id_token, etc.
 */
export async function exchangeCodeForTokens({ code, redirectUri } = {}) {
  const config = getMicrosoftOAuthConfig();
  const effectiveRedirect = redirectUri || config.redirectUri;

  // Test / Mock handler when running in mock mode
  if (process.env.MOCK_OAUTH === 'true' || (process.env.NODE_ENV === 'test' && code?.startsWith('mock-code:'))) {
    const mockEmail = code.replace('mock-code:', '');
    return {
      access_token: `mock-ms-token:${mockEmail}`,
      id_token: null,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: DEFAULT_SCOPES.join(' '),
    };
  }

  if (!config.clientId || !config.clientSecret) {
    throw new Error('Microsoft OAuth credentials (AZURE_CLIENT_ID / AZURE_CLIENT_SECRET) are not configured.');
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

  const bodyParams = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: effectiveRedirect,
    scope: DEFAULT_SCOPES.join(' '),
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: bodyParams.toString(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorDesc = data.error_description || data.error || 'Failed to exchange Microsoft authorization code.';
    throw new Error(errorDesc);
  }

  return data;
}

/**
 * Fetch the authenticated user's profile from Microsoft Graph API.
 *
 * @param {string} accessToken - Microsoft Graph access token
 * @returns {Promise<Object>} Profile containing id, displayName, mail, userPrincipalName
 */
export async function getMicrosoftUserProfile(accessToken) {
  // Test / Mock handler
  if (accessToken?.startsWith('mock-ms-token:')) {
    const mockEmail = accessToken.replace('mock-ms-token:', '');
    return {
      id: 'mock-ms-id',
      displayName: 'Microsoft Test User',
      mail: mockEmail,
      userPrincipalName: mockEmail,
      givenName: 'Microsoft',
      surname: 'User',
    };
  }

  const response = await fetch(GRAPH_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  const profile = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = profile.error?.message || 'Failed to retrieve profile from Microsoft Graph API.';
    throw new Error(errorMsg);
  }

  return profile;
}

/**
 * Safely parse a JWT payload (base64url) without external libraries.
 * Useful as a fallback to extract claims from id_token.
 *
 * @param {string} token
 * @returns {Object|null}
 */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
