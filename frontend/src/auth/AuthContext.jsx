import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, silentRefresh } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { user, role }
  const [restoring, setRestoring] = useState(true);

  // On mount: try to restore session from the httpOnly refresh cookie.
  // If the cookie is valid, /api/auth/refresh returns a new access token
  // and we then fetch /api/auth/me to get the user object.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const newToken = await silentRefresh();
        if (!newToken || !active) {
          setRestoring(false);
          return;
        }
        // Token set in memory by silentRefresh — api() will pick it up.
        const me = await api('/auth/me');
        if (active && me) setSession(me);
      } catch {
        // No valid refresh cookie — user must log in manually.
      } finally {
        if (active) setRestoring(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    // api() returns body.data automatically (envelope unwrapped)
    const result = await api('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    // Store access token in memory (Phase 0 — not localStorage)
    setToken(result.accessToken ?? result.token ?? null);
    setSession({ user: result.user, role: result.role });
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      // Tell the server to clear the httpOnly refresh cookie
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Even if the server call fails, clear local state
    }
    setToken(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user:            session?.user ?? null,
      role:            session?.role ?? null,
      isAuthenticated: Boolean(session),
      restoring,
      login,
      logout,
    }),
    [session, restoring, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
