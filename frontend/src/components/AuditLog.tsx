import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAuditLog } from '../hooks/useAuditLog';
import { navigateTo } from '../navigation';
import { formatDateTime } from '../utils/format';
import { AUDIT_RESULT_STATUSES } from '../types/audit';
import type { AuditResultStatus } from '../types/audit';

const ACTION_SUGGESTIONS = [
  'CLIENT_CREATED',
  'CLIENT_UPDATED',
  'CLIENT_DELETED',
  'USER_REGISTERED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_PROFILE_UPDATED',
  'USER_PASSWORD_CHANGED',
  'RATE_CARD_CREATED',
  'RATE_CARD_UPDATED',
  'RATE_CARD_DELETED'
];

const ENTITY_TYPE_SUGGESTIONS = ['client', 'user', 'rate_card'];

const FILTER_DEBOUNCE_MS = 400;

const EMPTY_FILTERS = {
  action: '',
  entityType: '',
  entityId: '',
  actorId: '',
  resultStatus: '',
  from: '',
  to: ''
};

type FilterForm = typeof EMPTY_FILTERS;

/** datetime-local gives a naive timestamp; the API wants ISO-8601 it can parse. */
function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

interface AuditLogProps {
  onBackToOverview: () => void;
}

export const AuditLog: React.FC<AuditLogProps> = ({ onBackToOverview }) => {
  const { user } = useAuth();
  const canRead = user?.role === 'ADMIN' || user?.role === 'PRESALE_LEAD';

  const [filters, setFilters] = useState<FilterForm>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<FilterForm>(EMPTY_FILTERS);
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  const { entries, meta, isLoading, error, reload } = useAuditLog({
    page,
    limit,
    action: applied.action.trim() || undefined,
    entityType: applied.entityType.trim() || undefined,
    entityId: applied.entityId.trim() || undefined,
    actorId: applied.actorId.trim() || undefined,
    resultStatus: applied.resultStatus ? (applied.resultStatus as AuditResultStatus) : undefined,
    from: toIso(applied.from),
    to: toIso(applied.to)
  }, canRead);

  useEffect(() => {
    const timer = setTimeout(() => {
      setApplied(filters);
      setPage(1);
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters]);

  const totalPages = meta?.totalPages ?? 1;

  if (!canRead) {
    return (
      <div className="min-h-screen bg-[#f8fafc] px-4 py-8 font-sans text-slate-900 md:px-10">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
          <button onClick={onBackToOverview} className="text-xs font-mono font-bold text-brand-700 hover:underline">
            &larr; OVERVIEW
          </button>
          <h1 className="mt-2 text-xl font-bold">Audit trail</h1>
          <p className="mt-3 text-sm text-slate-600">
            Only admins and presale leads can read the audit trail. Your current role is
            {user?.role ? ` ${user.role}` : ' unknown'}, so this page calls no endpoint.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Sign in with an ADMIN or PRESALE_LEAD account, or ask a member of your organization who has that role.
          </p>
        </div>
      </div>
    );
  }

  const labelClass = 'flex flex-col gap-1 text-[10px] font-mono font-bold text-slate-500';
  const inputClass =
    'rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-sans font-normal normal-case tracking-normal';

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 font-sans text-slate-900 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={onBackToOverview} className="text-xs font-mono font-bold text-brand-700 hover:underline">
              &larr; OVERVIEW
            </button>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Audit trail</h1>
            <p className="mt-1 text-xs text-slate-500">
              Read-only history of every write in your organization. Newest first.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigateTo('clients')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Clients
            </button>
            <button
              onClick={reload}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              Reload
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className={labelClass}>
              ACTION
              <input
                list="audit-action-suggestions"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                placeholder="CLIENT_CREATED"
                maxLength={100}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              ENTITY TYPE
              <input
                list="audit-entity-suggestions"
                value={filters.entityType}
                onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                placeholder="client"
                maxLength={100}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              ENTITY ID
              <input
                value={filters.entityId}
                onChange={(e) => setFilters({ ...filters, entityId: e.target.value })}
                placeholder="uuid"
                maxLength={36}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              ACTOR ID
              <input
                value={filters.actorId}
                onChange={(e) => setFilters({ ...filters, actorId: e.target.value })}
                placeholder="uuid"
                maxLength={36}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              RESULT
              <select
                value={filters.resultStatus}
                onChange={(e) => setFilters({ ...filters, resultStatus: e.target.value })}
                className={inputClass}
              >
                <option value="">Any</option>
                {AUDIT_RESULT_STATUSES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              FROM
              <input
                type="datetime-local"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              TO
              <input
                type="datetime-local"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              PAGE SIZE
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className={inputClass}
              >
                {[20, 50, 100, 200].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setApplied(EMPTY_FILTERS);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Clear filters
            </button>
            <span className="text-xs text-slate-400">
              Filters apply automatically a moment after you stop typing. Action and entity type match exactly.
            </span>
          </div>
          <datalist id="audit-action-suggestions">
            {ACTION_SUGGESTIONS.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
          <datalist id="audit-entity-suggestions">
            {ENTITY_TYPE_SUGGESTIONS.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-mono font-bold text-slate-500">
              <tr>
                <th className="px-4 py-3">WHEN</th>
                <th className="px-4 py-3">ACTOR</th>
                <th className="px-4 py-3">ACTION</th>
                <th className="px-4 py-3">ENTITY</th>
                <th className="px-4 py-3">RESULT</th>
                <th className="px-4 py-3">DETAIL</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading…</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No audit entries match these filters.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-bold text-slate-700">{entry.actorName ?? 'System'}</div>
                      <div className="truncate font-mono text-[10px] text-slate-400">{entry.userId ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold text-slate-700">{entry.action}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div className="font-mono">{entry.entityType}</div>
                      <div className="truncate font-mono text-[10px] text-slate-400">{entry.entityId ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                          entry.resultStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {entry.resultStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer text-[10px] font-mono font-bold text-slate-500 hover:text-slate-800">
                          payload
                        </summary>
                        <pre className="mt-2 max-w-sm overflow-x-auto rounded bg-slate-50 p-2 font-mono text-[10px] text-slate-600">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono">
            {meta ? `${meta.total} entries • page ${meta.page}/${totalPages}` : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="rounded border border-slate-300 px-3 py-1 font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

export default AuditLog;
