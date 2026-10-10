import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // No user object in localStorage — token only. /auth/me is the single source
  // of truth for the user shape, so role can't be spoofed via dev tools storage.
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while /auth/me is in flight

  // On mount, verify the stored token and hydrate the user object
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch((err) => {
        // Only clear the token on a genuine auth failure, not a network drop.
        // The interceptor already handles 401s for token-bearing requests; this
        // covers the edge case where the interceptor fires before this effect.
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          setUser(null);
        }
        // Any other error (500, network timeout) — keep the token and retry
        // on the next page load rather than logging the user out silently.
      })
      .finally(() => setLoading(false));
  }, []);

  // Listen for the 'auth:expired' event dispatched by the Axios interceptor.
  // Sets user to null so ProtectedRoute redirects via React Router — no reload.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    // Store only the token — user state lives in React, not localStorage
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (fields) => {
    const { data } = await api.post('/auth/register', fields);
    return data.user; // registration does not auto-login; caller redirects to /login
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
