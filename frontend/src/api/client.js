let memoryToken = null;

// Clean up any legacy localStorage tokens on load
try {
  localStorage.removeItem('mmrms.token');
} catch {
  // Ignore in SSR/non-browser contexts
}

export function getToken() {
  return memoryToken;
}

export function setToken(token) {
  memoryToken = token;
  try {
    localStorage.removeItem('mmrms.token');
  } catch {
    // Ignore in non-browser contexts
  }
}

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

let refreshingPromise = null;

async function refreshAccessToken() {
  if (!refreshingPromise) {
    refreshingPromise = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (!response.ok) {
          setToken(null);
          return null;
        }
        const text = await response.text();
        const payload = text ? JSON.parse(text) : null;
        const data = payload?.data !== undefined ? payload.data : payload;
        const token = data?.accessToken ?? data?.token ?? null;
        setToken(token);
        return data;
      } catch {
        setToken(null);
        return null;
      } finally {
        refreshingPromise = null;
      }
    })();
  }
  return refreshingPromise;
}

/** Thin fetch wrapper: attaches bearer token, passes cookies, unwraps envelopes, and handles 401 refresh. */
export async function api(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
  });

  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  const payload = text && contentType.includes('application/json') ? JSON.parse(text) : null;

  if (response.status === 401 && auth && retry && !path.startsWith('/auth/')) {
    const refreshData = await refreshAccessToken();
    if (refreshData?.accessToken || refreshData?.token) {
      return api(path, { method, body, auth, retry: false });
    }
  }

  if (!response.ok) {
    const errorMsg =
      typeof payload?.error === 'string'
        ? payload.error
        : payload?.error?.message ?? response.statusText;
    throw new ApiError(response.status, errorMsg, payload);
  }

  if (text && !payload) {
    throw new ApiError(502, 'API returned an unexpected response. Check the Vercel API deployment.', {
      contentType,
    });
  }

  return payload && typeof payload === 'object' && payload.data !== undefined ? payload.data : payload;
}
