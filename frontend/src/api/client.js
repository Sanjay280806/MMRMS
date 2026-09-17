const TOKEN_KEY = 'mmrms.token';

/**
 * In-memory access token store.
 * After Phase 0 the token is NEVER written to localStorage.
 * It lives in memory only — lost on page refresh (restored via /api/auth/refresh).
 */
let _accessToken = null;

/** @returns {string|null} */
export function getToken() {
  return _accessToken;
}

/** @param {string|null} token */
export function setToken(token) {
  _accessToken = token ?? null;
  // Phase 0: also clear any legacy localStorage token on every setToken call
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

let _refreshing = null; // Singleton promise to prevent concurrent refresh calls

/**
 * Thin fetch wrapper.
 * - Attaches Bearer token (from memory).
 * - Sends credentials: include so the httpOnly refresh cookie is sent.
 * - Unwraps the Phase-0 envelope: returns body.data when success:true.
 * - On 401: attempts one silent token refresh then retries.
 * - On error: throws ApiError.
 */
export async function api(path, { method = 'GET', body, auth = true, _retry = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = auth ? getToken() : null;
  if (token) headers.Authorization = 'Bearer ' + token;

  const response = await fetch('/api' + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include', // Phase 0: send httpOnly cookie on every request
  });

  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  const payload = text && contentType.includes('application/json') ? JSON.parse(text) : null;

  // Silent refresh on 401 (once per call chain)
  if (response.status === 401 && auth && !_retry) {
    const newToken = await silentRefresh();
    if (newToken) {
      return api(path, { method, body, auth, _retry: true });
    }
    // Refresh failed — clear token and re-throw
    setToken(null);
    throw new ApiError(401, payload?.error?.message ?? 'Session expired', payload);
  }

  if (!response.ok) {
    // Use envelope error shape when available
    const message = payload?.error?.message ?? payload?.error ?? response.statusText;
    throw new ApiError(response.status, message, payload);
  }

  // Unwrap envelope (Phase 0+): return data field when present
  if (payload && typeof payload.success === 'boolean') {
    return payload.data;
  }

  return payload;
}

/**
 * Calls POST /api/auth/refresh with the httpOnly cookie.
 * Returns the new access token string, or null on failure.
 */
async function silentRefresh() {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const json = await res.json();
      // Unwrap envelope if needed
      const token = json?.data?.accessToken ?? json?.accessToken ?? null;
      if (token) setToken(token);
      return token;
    } catch {
      return null;
    } finally {
      _refreshing = null;
    }
  })();
  return _refreshing;
}

/** Exported so AuthContext can call it on mount to restore session. */
export { silentRefresh };
