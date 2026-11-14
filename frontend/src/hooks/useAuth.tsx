import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError } from '../services/apiClient';
import { authService } from '../services/authService';
import type { LoginInput, RegisterInput } from '../services/authService';
import type { AuthUser, SessionData } from '../types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (input: LoginInput) => Promise<AuthUser>;
  devLogin: (email?: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  syncUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async (): Promise<SessionData | null> => {
      try {
        return await authService.me();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          try {
            return await authService.refresh();
          } catch {
            return null;
          }
        }
        return null;
      }
    };

    void restoreSession().then((session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setStatus(session?.user ? 'authenticated' : 'anonymous');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await authService.login(input);
    setUser(session.user);
    setStatus('authenticated');
    return session.user;
  }, []);

  const devLogin = useCallback(async (email: string = 'ntbinh1@gmail.com') => {
    const session = await authService.devLogin(email);
    setUser(session.user);
    setStatus('authenticated');
    return session.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const created = await authService.register(input);
    setUser(created.user);
    setStatus('authenticated');
    return created.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const syncUser = useCallback((next: AuthUser) => {
    setUser(next);
  }, []);

  const value = useMemo(
    () => ({ status, user, login, devLogin, register, logout, syncUser }),
    [status, user, login, devLogin, register, logout, syncUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};