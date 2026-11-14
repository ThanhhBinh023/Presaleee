import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMemberDirectory } from '../hooks/useMemberDirectory';
import { userService } from '../services/userService';
import { navigateTo } from '../navigation';
import { formatDateTime } from '../utils/format';
import type { MemberListQuery } from '../services/userService';
import type { MemberDirectoryEntry } from '../types/user';
import type { UserRole, UserStatus } from '../types/auth';

const ROLES: UserRole[] = ['ADMIN', 'PRESALE_LEAD', 'PRESALE_CONSULTANT', 'SOLUTION_ARCHITECT', 'SALES_REP', 'VIEWER'];
const STATUSES: UserStatus[] = ['ACTIVE', 'INVITED', 'DEACTIVATED'];
const PAGE_SIZE = 20;

interface MembersDirectoryProps {
  onBackToOverview: () => void;
}

export const MembersDirectory: React.FC<MembersDirectoryProps> = ({ onBackToOverview }) => {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'PRESALE_LEAD';
  const isAdmin = user?.role === 'ADMIN';

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [allOrganizations, setAllOrganizations] = useState(false);
  const [page, setPage] = useState(1);

  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ email: '', fullName: '', password: '', role: 'VIEWER' as UserRole });
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [detail, setDetail] = useState<MemberDirectoryEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      setDetail(await userService.getMember(id));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load member details.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, role, status, allOrganizations]);

  const query: MemberListQuery = {
    page,
    limit: PAGE_SIZE,
    role: role || undefined,
    status: status || undefined,
    search: search || undefined,
    allOrganizations
  };
  const { members, meta, isLoading, error, reload } = useMemberDirectory(query);

  const runAction = async (action: () => Promise<unknown>, successMessage: string): Promise<boolean> => {
    setIsSubmitting(true);
    setActionError(null);
    setNotice(null);
    try {
      await action();
      setNotice(successMessage);
      reload();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitInvite = async () => {
    const ok = await runAction(
      () => userService.addMember({ email: invite.email, fullName: invite.fullName, password: invite.password, role: invite.role }),
      'Member added.'
    );
    if (ok) {
      setInvite({ email: '', fullName: '', password: '', role: 'VIEWER' });
      setShowInvite(false);
    }
  };

  const changeRole = (id: string, next: UserRole) =>
    runAction(() => userService.updateMember(id, { role: next }), 'Role updated.');

  const toggleStatus = (id: string, next: UserStatus) =>
    runAction(
      () => userService.updateMember(id, { status: next }),
      next === 'DEACTIVATED' ? 'Member deactivated and their sessions revoked.' : 'Member reactivated.'
    );

  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 font-sans text-slate-900 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={onBackToOverview} className="text-xs font-mono font-bold text-brand-700 hover:underline">
              &larr; OVERVIEW
            </button>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Members &amp; Organizations</h1>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <button
                onClick={() => setShowInvite((value) => !value)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
              >
                {showInvite ? 'Close' : 'Add member'}
              </button>
            )}
            <button
              onClick={() => navigateTo('profile')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              My profile
            </button>
          </div>
        </div>

        {actionError && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p>}
        {notice && <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

        {showInvite && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={invite.fullName}
                onChange={(event) => setInvite({ ...invite, fullName: event.target.value })}
                placeholder="Full name"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="email"
                value={invite.email}
                onChange={(event) => setInvite({ ...invite, email: event.target.value })}
                placeholder="name@company.com"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="password"
                value={invite.password}
                onChange={(event) => setInvite({ ...invite, password: event.target.value })}
                placeholder="Password (min 12 characters)"
                minLength={12}
                maxLength={128}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={invite.role}
                onChange={(event) => setInvite({ ...invite, role: event.target.value as UserRole })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {ROLES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <button
              onClick={submitInvite}
              disabled={isSubmitting || !invite.email || !invite.fullName || invite.password.length < 12}
              className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
            >
              Create account
            </button>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="flex flex-col gap-1 text-[10px] font-mono font-bold text-slate-500">
            SEARCH
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="name or email"
              className="w-44 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-sans font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-mono font-bold text-slate-500">
            ROLE
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole | '')}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-sans font-normal"
            >
              <option value="">All</option>
              {ROLES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-mono font-bold text-slate-500">
            STATUS
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as UserStatus | '')}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-sans font-normal"
            >
              <option value="">All</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allOrganizations} onChange={(event) => setAllOrganizations(event.target.checked)} />
              All organizations
            </label>
          )}
          <button onClick={reload} className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Reload
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-mono font-bold text-slate-500">
              <tr>
                <th className="px-4 py-3">MEMBER</th>
                <th className="px-4 py-3">ROLE</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3">ORGANIZATION</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">Loading…</td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">No members match these filters.</td>
                </tr>
              ) : (
                members.map((member) => {
                  const isSelf = member.id === user?.id;
                  return (
                    <tr key={member.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-bold">{member.fullName}</div>
                        <div className="text-xs text-slate-500">{member.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {canManage && !isSelf ? (
                          <select
                            value={member.role}
                            onChange={(event) => changeRole(member.id, event.target.value as UserRole)}
                            className="rounded border border-slate-300 px-1.5 py-1 text-xs"
                          >
                            {ROLES.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-mono font-bold text-slate-700">{member.role}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                            member.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : member.status === 'INVITED'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{member.organizationName ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => void openDetail(member.id)}
                          disabled={detailLoading}
                          className="mr-2 rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Details
                        </button>
                        {canManage && !isSelf && (
                          <button
                            onClick={() => toggleStatus(member.id, member.status === 'DEACTIVATED' ? 'ACTIVE' : 'DEACTIVATED')}
                            disabled={isSubmitting}
                            className="rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {member.status === 'DEACTIVATED' ? 'Activate' : 'Deactivate'}
                          </button>
                        )}
                        {isSelf && <span className="text-[10px] font-mono text-slate-400">YOU</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {(detail !== null || detailLoading || detailError !== null) && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Member details</h2>
              <button
                onClick={() => {
                  setDetail(null);
                  setDetailError(null);
                }}
                className="text-xs font-bold text-slate-500 hover:underline"
              >
                Close
              </button>
            </div>
            {detailLoading && <p className="text-sm text-slate-400">Loading…</p>}
            {detailError !== null && <p className="text-sm text-rose-600">{detailError}</p>}
            {detail !== null && (
              <dl className="grid gap-x-6 text-sm md:grid-cols-2">
                <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                  <dt className="text-slate-500">Full name</dt>
                  <dd className="font-bold">{detail.fullName}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="truncate font-mono text-xs">{detail.email}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                  <dt className="text-slate-500">Role</dt>
                  <dd className="font-mono font-bold">{detail.role}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-mono font-bold">{detail.status}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                  <dt className="text-slate-500">Organization</dt>
                  <dd>{detail.organizationName ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                  <dt className="text-slate-500">User ID</dt>
                  <dd className="truncate font-mono text-xs">{detail.id}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                  <dt className="text-slate-500">Created</dt>
                  <dd className="font-mono text-xs">{formatDateTime(detail.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                  <dt className="text-slate-500">Last updated</dt>
                  <dd className="font-mono text-xs">{formatDateTime(detail.updatedAt)}</dd>
                </div>
              </dl>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono">{meta ? `${meta.total} members • page ${meta.page}/${totalPages}` : ''}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1 || isLoading}
              className="rounded border border-slate-300 px-3 py-1 font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages || isLoading}
              className="rounded border border-slate-300 px-3 py-1 font-bold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembersDirectory;
