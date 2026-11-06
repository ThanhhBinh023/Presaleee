import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useOrganizations } from '../hooks/useOrganizations';
import { userService } from '../services/userService';
import { navigateTo } from '../navigation';
import { formatDateTime, initialsOf } from '../utils/format';
import type { MemberDirectoryEntry } from '../types/user';

const PASSWORD_MIN = 12;

export const Profile: React.FC = () => {
  const { user, syncUser } = useAuth();
  const { organizations } = useOrganizations();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [detail, setDetail] = useState<MemberDirectoryEntry | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    userService
      .getMember(userId)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setDetailError(err instanceof Error ? err.message : 'Failed to load account details.');
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveProfile = async () => {
    setIsSavingProfile(true);
    setNotice(null);
    setError(null);
    try {
      const result = await userService.updateOwnProfile({ fullName: fullName.trim(), avatarUrl: avatarUrl.trim() });
      syncUser(result.user);
      setNotice('Profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setIsChangingPassword(true);
    setNotice(null);
    setError(null);
    try {
      const result = await userService.updateOwnProfile({ password: newPassword, currentPassword });
      syncUser(result.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice('Password changed. All existing sessions were revoked, so you may need to sign in again shortly.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isProfileDirty = fullName !== (user?.fullName ?? '') || avatarUrl !== (user?.avatarUrl ?? '');
  const isPasswordReady = currentPassword.length > 0 && newPassword.length >= PASSWORD_MIN && confirmPassword.length > 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 font-sans text-slate-900 md:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <button onClick={() => navigateTo('overview')} className="text-xs font-mono font-bold text-brand-700 hover:underline">
            &larr; OVERVIEW
          </button>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">My profile</h1>
        </div>

        {notice && <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
        {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Display information</h2>
            <div className="mb-4 flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="h-12 w-12 rounded-full border border-slate-200 object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                  {initialsOf(fullName || 'SE')}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{user?.fullName || 'Not signed in'}</div>
                <div className="truncate font-mono text-[11px] text-slate-400">{user?.email || '—'}</div>
              </div>
            </div>
            <label className="mb-3 block">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Full name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                maxLength={255}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Avatar URL (leave blank to hide the image)</span>
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                maxLength={2000}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              onClick={saveProfile}
              disabled={isSavingProfile || !isProfileDirty || fullName.trim().length === 0}
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
            >
              {isSavingProfile ? 'Saving…' : 'Save profile'}
            </button>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Change password</h2>
            <label className="mb-3 block">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="mb-3 block">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">New password (min {PASSWORD_MIN} characters)</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={PASSWORD_MIN}
                maxLength={128}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              onClick={changePassword}
              disabled={isChangingPassword || !isPasswordReady}
              className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
            >
              {isChangingPassword ? 'Changing…' : 'Change password'}
            </button>
          </section>
        </div>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Account details</h2>
          {detailError && <p className="mb-2 text-sm text-rose-600">{detailError}</p>}
          <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
            <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
              <dt className="text-slate-500">Role</dt>
              <dd className="font-mono font-bold">{user?.role ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-mono font-bold">{user?.status ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
              <dt className="text-slate-500">Organization</dt>
              <dd className="truncate font-bold">{detail?.organizationName ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
              <dt className="text-slate-500">Organization ID</dt>
              <dd className="font-mono font-bold">{detail?.organizationId ? detail.organizationId.slice(0, 8) : 'not assigned'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
              <dt className="text-slate-500">Created</dt>
              <dd className="font-mono">{formatDateTime(detail?.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
              <dt className="text-slate-500">Last updated</dt>
              <dd className="font-mono">{formatDateTime(detail?.updatedAt)}</dd>
            </div>
          </dl>

          {organizations.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Your organizations</h3>
              <ul className="space-y-1 text-sm">
                {organizations.map((organization) => (
                  <li key={organization.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <span className="font-bold">{organization.name}</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {organization.domain ?? 'no domain'} • {organization.plan} • {organization.memberCount} members
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Profile;
