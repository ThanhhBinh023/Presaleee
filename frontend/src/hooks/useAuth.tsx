import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError } from '../services/apiClient';
import { authService } from '../services/authService';
import type { LoginInput, RegisterInput } from '../services/authService';
import type { AuthUser, SessionData, UserRole } from '../types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (input: LoginInput) => Promise<AuthUser>;
  devLogin: (email?: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  syncUser: (user: AuthUser) => void;
  setSimulatedRole: (role: UserRole | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async (): Promise<SessionData | null> => {
      try {
        const session = await authService.me();
        const simRole = localStorage.getItem('presaleee_simulated_role') as UserRole | null;
        if (session && simRole) {
          session.user.role = simRole;
        }
        return session;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          try {
            const session = await authService.refresh();
            const simRole = localStorage.getItem('presaleee_simulated_role') as UserRole | null;
            if (session && simRole) {
              session.user.role = simRole;
            }
            return session;
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
    const simRole = localStorage.getItem('presaleee_simulated_role') as UserRole | null;
    if (simRole) {
      session.user.role = simRole;
    }
    setUser(session.user);
    setStatus('authenticated');
    return session.user;
  }, []);

  const devLogin = useCallback(async (email: string = 'ntbinh1@gmail.com') => {
    const session = await authService.devLogin(email);
    const simRole = localStorage.getItem('presaleee_simulated_role') as UserRole | null;
    if (simRole) {
      session.user.role = simRole;
    }
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
      localStorage.removeItem('presaleee_simulated_role');
      await authService.logout();
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const syncUser = useCallback((next: AuthUser) => {
    setUser(next);
  }, []);

  const setSimulatedRole = useCallback((role: UserRole | null) => {
    if (role) {
      localStorage.setItem('presaleee_simulated_role', role);
      setUser(prev => prev ? { ...prev, role } : null);
    } else {
      localStorage.removeItem('presaleee_simulated_role');
      void authService.me().then(session => {
        if (session) setUser(session.user);
      }).catch(() => {});
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, login, devLogin, register, logout, syncUser, setSimulatedRole }),
    [status, user, login, devLogin, register, logout, syncUser, setSimulatedRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};