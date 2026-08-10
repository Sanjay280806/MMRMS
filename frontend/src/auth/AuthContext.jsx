import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { user, role }
  const [restoring, setRestoring] = useState(true);

  // Re-establish the session from a stored token on first load. With no token
  // there is nothing to restore, so we skip the request rather than 401.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!getToken()) {
        setRestoring(false);
        return;
      }
      try {
        const me = await api('/auth/me');
        if (active) setSession(me);
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
    setToken(result.token);
    setSession({ user: result.user, role: result.role });
    return result;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setSession(null);
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
