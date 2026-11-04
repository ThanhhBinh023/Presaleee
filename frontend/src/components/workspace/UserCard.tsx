import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { navigateTo } from '../../navigation';
import { initialsOf } from '../../utils/format';

interface UserCardProps {
  onLogout: () => void;
  subtitle?: 'email' | 'role';
  logoutTitle?: string;
}

export const UserCard: React.FC<UserCardProps> = ({ onLogout, subtitle = 'email', logoutTitle = 'Sign out' }) => {
  const { user } = useAuth();
  const secondLine = !user ? '—' : subtitle === 'role' ? user.role.replace(/_/g, ' ') : user.email;

  return (
    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
      <button
        onClick={() => navigateTo('profile')}
        title="My profile"
        className="flex items-center gap-2.5 overflow-hidden min-w-0 text-left hover:opacity-80 transition-opacity"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
            {initialsOf(user?.fullName || 'SE')}
          </div>
        )}
        <div className="truncate min-w-0">
          <div className="text-xs font-bold text-slate-800 truncate">{user?.fullName || 'Not signed in'}</div>
          <div className="text-[11px] font-mono text-slate-400 truncate">{secondLine}</div>
        </div>
      </button>

      <button
        onClick={onLogout}
        title={logoutTitle}
        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
};

export default UserCard;
