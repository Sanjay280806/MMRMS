import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { user, role }
  const [restoring, setRestoring] = useState(true);

  // Re-establish the session: first try /api/auth/refresh with httpOnly cookie.
  // If no cookie, fall back to stored token with /api/auth/me.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const refreshed = await api('/auth/refresh', { method: 'POST', auth: false });
        const refData = (refreshed && refreshed.success && refreshed.data) ? refreshed.data : refreshed;
        if (active && (refData?.accessToken || refData?.token)) {
          const tok = refData.accessToken || refData.token;
          setToken(tok);
          setSession({ user: refData.user, role: refData.role });
          setRestoring(false);
          return;
        }
      } catch {
        // Refresh cookie not present or expired; try token restore
      }

      const storedToken = getToken();
      if (!storedToken) {
        if (active) setRestoring(false);
        return;
      }

      try {
        const me = await api('/auth/me');
        const meData = (me && me.success && me.data) ? me.data : me;
        if (active) setSession({ user: meData.user, role: meData.role });
      } catch {
        setToken(null);
      } finally {
        if (active) setRestoring(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await api('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    const data = (result && result.success && result.data) ? result.data : result;
    const user = data?.user || result?.user;
    const role = data?.role || result?.role;
    const token = data?.accessToken || data?.token || result?.accessToken || result?.token;
    setToken(token);
    setSession({ user, role });
    return { ...result, ...data, user, role, token, accessToken: token };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST', auth: false });
    } catch {
      // Ignore errors on logout
    } finally {
      setToken(null);
      setSession(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      role: session?.role ?? null,
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
