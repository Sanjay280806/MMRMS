const TOKEN_KEY = 'mmrms.token';
let memoryToken = null;

export function getToken() {
  const t = memoryToken || localStorage.getItem(TOKEN_KEY);
  if (!t || t === 'undefined' || t === 'null') return null;
  return t;
}

export function setToken(token) {
  if (token === 'undefined' || token === 'null') token = null;
  memoryToken = token;
  if (token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  } else {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage errors
    }
  }
}

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/** Thin fetch wrapper: attaches the bearer token, credentials, and unwraps API envelope. */
export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // If 401 on authenticated call, attempt token refresh and retry once
  if (response.status === 401 && auth && path !== '/auth/login' && path !== '/auth/refresh') {
    try {
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        const refreshData = (refreshJson && refreshJson.success && refreshJson.data) ? refreshJson.data : refreshJson;
        const newTok = refreshData?.accessToken || refreshData?.token;
        if (newTok) {
          setToken(newTok);
          headers.Authorization = `Bearer ${newTok}`;
          response = await fetch(`/api${path}`, {
            method,
            headers,
            credentials: 'include',
            body: body === undefined ? undefined : JSON.stringify(body),
          });
        }
      }
    } catch {
      // Ignore refresh error; fallback to default error handling
    }
  }

  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  const payload = text && contentType.includes('application/json') ? JSON.parse(text) : null;

  if (!response.ok) {
    const errorMsg = (typeof payload?.error === 'string' ? payload.error : null)
      ?? payload?.error?.message
      ?? payload?.message
      ?? response.statusText;
    throw new ApiError(response.status, errorMsg, payload);
  }

  if (text && !payload) {
    throw new ApiError(502, 'API returned an unexpected response.', {
      contentType,
    });
  }

  // If response is wrapped in standard envelope { success: true, data: ... }
  if (payload && typeof payload === 'object' && 'data' in payload && payload.success === true) {
    const data = payload.data;
    if (data !== null && typeof data === 'object') {
      if (Array.isArray(data)) {
        try {
          Object.defineProperties(data, {
            success: { value: true, writable: true, configurable: true },
            data: { value: data, writable: true, configurable: true },
          });
        } catch {
          // Ignore
        }
      } else {
        if (data.success === undefined) data.success = true;
      }
      return data;
    }
    return data;
  }

  return payload;
}
