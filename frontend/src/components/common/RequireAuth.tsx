import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const RequireAuth: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'anonymous') {
      window.location.hash = '#signin';
    }
  }, [status]);

  if (status === 'authenticated') return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#fafbfa]">
      <span className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      <span className="text-xs font-mono text-slate-500">
        {status === 'loading' ? 'Restoring your session...' : 'Redirecting to sign in...'}
      </span>
    </div>
  );
};