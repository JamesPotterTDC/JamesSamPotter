'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export interface AuthUser {
  username: string;
  display_name: string;
  avatar_url: string | null;
  visibility: 'private' | 'friends' | 'public';
  ftp?: number | null;
  primary_bike_distance_m?: number | null;
  data_start_date?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  setTokens: (access: string, refresh: string, user: AuthUser) => void;
  logout: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_TOKEN_KEY = 'velo_access';
const USER_KEY = 'velo_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        setState({
          user: JSON.parse(storedUser),
          accessToken: storedToken,
          isLoading: false,
          isAuthenticated: true,
        });
        return;
      }
    } catch {}
    setState(s => ({ ...s, isLoading: false }));
  }, []);

  const setTokens = useCallback((access: string, refresh: string, user: AuthUser) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    // Store refresh token in httpOnly cookie via Next.js API route
    fetch('/api/auth/set-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    }).catch(() => {});

    setState({
      user,
      accessToken: access,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
  }, []);

  /**
   * Attempt to refresh the access token using the httpOnly refresh cookie.
   * Returns the new access token string, or null if it fails.
   */
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (!res.ok) {
        logout();
        return null;
      }
      const { access } = await res.json();
      localStorage.setItem(ACCESS_TOKEN_KEY, access);
      setState(s => ({ ...s, accessToken: access }));
      return access;
    } catch {
      logout();
      return null;
    }
  }, [logout]);

  /**
   * Authenticated fetch — automatically attaches Bearer token and retries
   * once on 401 by refreshing.
   */
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    let token = state.accessToken;

    const makeRequest = (t: string | null) =>
      fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string> || {}),
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
        },
        cache: 'no-store',
      });

    let res = await makeRequest(token);

    if (res.status === 401) {
      token = await refreshAccessToken();
      if (token) {
        res = await makeRequest(token);
      }
    }

    return res;
  }, [state.accessToken, refreshAccessToken]);

  /** Re-fetch the /api/auth/me endpoint and update stored user info. */
  const refreshUser = useCallback(async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    try {
      const res = await fetchWithAuth(`${apiUrl}/auth/me/`);
      if (res.ok) {
        const data = await res.json();
        const user: AuthUser = {
          username: data.username,
          display_name: data.display_name,
          avatar_url: data.avatar_url,
          visibility: data.visibility,
          ftp: data.ftp,
          primary_bike_distance_m: data.primary_bike_distance_m,
          data_start_date: data.data_start_date,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        setState(s => ({ ...s, user }));
      }
    } catch {}
  }, [fetchWithAuth]);

  return (
    <AuthContext.Provider value={{ ...state, setTokens, logout, fetchWithAuth, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
