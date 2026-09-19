import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { user, role }
  const [restoring, setRestoring] = useState(true);

  // Re-establish session on mount via refresh cookie
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api('/auth/refresh', {
          method: 'POST',
          auth: false,
          retry: false,
        });
        if (active && res) {
          setToken(res.accessToken ?? res.token);
          setSession({ user: res.user, role: res.role });
        }
      } catch {
        setToken(null);
        setSession(null);
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
    setToken(result.accessToken ?? result.token);
    setSession({ user: result.user, role: result.role });
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST', auth: false, retry: false });
    } catch {
      // Ignore network errors on logout
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
