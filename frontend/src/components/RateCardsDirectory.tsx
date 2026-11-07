import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRateCards } from '../hooks/useRateCards';
import { rateCardService } from '../services/rateCardService';
import { proposalService } from '../services/proposalService';
import type { CreateRateCardInput, UpdateRateCardInput } from '../services/rateCardService';
import { navigateTo } from '../navigation';
import { formatDateTime, formatMoney } from '../utils/format';
import { RATE_CARD_LEVELS } from '../types/rateCard';
import type { PricingInputLine, PricingResponse, ProposalSummary, RateCardLevel, RateCardRecord } from '../types/rateCard';

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  roleName: '',
  level: 'SENIOR' as RateCardLevel,
  hourlyRateUsd: '',
  dailyRateUsd: '',
  monthlyRateUsd: '',
  currency: 'USD',
  isActive: true
};

type FormState = typeof EMPTY_FORM;

interface StaffingRow {
  roleName: string;
  level: RateCardLevel | '';
  rateCardId: string;
  manMonths: string;
  monthlyRateOverride: string;
}

const emptyStaffingRow = (): StaffingRow => ({
  roleName: '',
  level: 'SENIOR',
  rateCardId: '',
  manMonths: '1',
  monthlyRateOverride: ''
});

function toForm(card: RateCardRecord): FormState {
  return {
    roleName: card.roleName,
    level: card.level,
    hourlyRateUsd: card.hourlyRateUsd ? String(card.hourlyRateUsd) : '',
    dailyRateUsd: card.dailyRateUsd ? String(card.dailyRateUsd) : '',
    monthlyRateUsd: card.monthlyRateUsd === null || card.monthlyRateUsd === undefined ? '' : String(card.monthlyRateUsd),
    currency: card.currency,
    isActive: card.isActive
  };
}

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildCreate(form: FormState): CreateRateCardInput {
  return {
    roleName: form.roleName.trim(),
    level: form.level,
    hourlyRateUsd: optionalNumber(form.hourlyRateUsd) ?? 0,
    dailyRateUsd: optionalNumber(form.dailyRateUsd) ?? 0,
    monthlyRateUsd: optionalNumber(form.monthlyRateUsd) ?? null,
    currency: form.currency.trim().toUpperCase() || 'USD',
    isActive: form.isActive
  };
}

function buildPatch(original: RateCardRecord, form: FormState): UpdateRateCardInput {
  const patch: UpdateRateCardInput = {};
  const roleName = form.roleName.trim();
  if (roleName && roleName !== original.roleName) patch.roleName = roleName;
  if (form.level !== original.level) patch.level = form.level;
  const hourly = optionalNumber(form.hourlyRateUsd);
  if (hourly !== undefined && hourly !== original.hourlyRateUsd) patch.hourlyRateUsd = hourly;
  const daily = optionalNumber(form.dailyRateUsd);
  if (daily !== undefined && daily !== original.dailyRateUsd) patch.dailyRateUsd = daily;
  const monthly = form.monthlyRateUsd.trim() === '' ? null : optionalNumber(form.monthlyRateUsd) ?? null;
  if (monthly !== original.monthlyRateUsd) patch.monthlyRateUsd = monthly;
  const currency = form.currency.trim().toUpperCase();
  if (currency && currency !== original.currency) patch.currency = currency;
  if (form.isActive !== original.isActive) patch.isActive = form.isActive;
  return patch;
}

interface RateCardsDirectoryProps {
  onBackToOverview: () => void;
}

export const RateCardsDirectory: React.FC<RateCardsDirectoryProps> = ({ onBackToOverview }) => {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'PRESALE_LEAD';

  const [roleInput, setRoleInput] = useState('');
  const [roleName, setRoleName] = useState('');
  const [level, setLevel] = useState<RateCardLevel | ''>('');
  const [currency, setCurrency] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [page, setPage] = useState(1);

  const [mode, setMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editing, setEditing] = useState<RateCardRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [staffing, setStaffing] = useState<StaffingRow[]>([emptyStaffingRow()]);
  const [quoteCurrency, setQuoteCurrency] = useState('USD');
  const [proposalId, setProposalId] = useState('');
  const [applyToProposal, setApplyToProposal] = useState(false);
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [pricingResult, setPricingResult] = useState<PricingResponse | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [isPricing, setIsPricing] = useState(false);

  const { rateCards, meta, isLoading, error, reload } = useRateCards({
    page,
    limit: PAGE_SIZE,
    roleName: roleName || undefined,
    level: level || undefined,
    currency: currency || undefined,
    includeInactive
  });

  useEffect(() => {
    const timer = setTimeout(() => setRoleName(roleInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [roleInput]);

  useEffect(() => {
    setPage(1);
  }, [roleName, level, currency, includeInactive]);

  useEffect(() => {
    proposalService
      .list({ page: 1, limit: 50 })
      .then((result) => setProposals(result.proposals))
      .catch(() => setProposals([]));
  }, []);

  const totalPages = meta?.totalPages ?? 1;

  const openCreate = () => {
    setMode('create');
    setEditing(null);
    setForm(EMPTY_FORM);
    setActionError(null);
    setNotice(null);
  };

  const openEdit = (card: RateCardRecord) => {
    setMode('edit');
    setEditing(card);
    setForm(toForm(card));
    setActionError(null);
    setNotice(null);
  };

  const closeForm = () => {
    setMode('none');
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    setActionError(null);
    setNotice(null);
    try {
      if (mode === 'edit' && editing) {
        const patch = buildPatch(editing, form);
        if (Object.keys(patch).length === 0) {
          setActionError('Nothing to save — change at least one field.');
          return;
        }
        const updated = await rateCardService.update(editing.id, patch);
        setNotice(`Saved ${updated.roleName} (${updated.level}).`);
      } else {
        const created = await rateCardService.create(buildCreate(form));
        setNotice(`Created ${created.roleName} (${created.level}).`);
      }
      closeForm();
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeCard = async (card: RateCardRecord) => {
    setActionError(null);
    setNotice(null);
    try {
      await rateCardService.delete(card.id);
      setNotice(`Deleted ${card.roleName}.`);
      setConfirmDeleteId(null);
      reload();
    } catch (err) {
      setConfirmDeleteId(null);
      setActionError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const pinCard = (card: RateCardRecord) => {
    setStaffing((rows) => {
      const next = [...rows];
      const emptyIndex = next.findIndex((row) => !row.roleName && !row.rateCardId);
      const line: StaffingRow = {
        roleName: card.roleName,
        level: card.level,
        rateCardId: card.id,
        manMonths: '1',
        monthlyRateOverride: ''
      };
      if (emptyIndex >= 0) next[emptyIndex] = line;
      else next.push(line);
      return next;
    });
    setQuoteCurrency(card.currency);
    setNotice(`Pinned ${card.roleName} into the pricing sheet.`);
  };

  const runPricing = async (apply: boolean) => {
    setIsPricing(true);
    setPricingError(null);
    setPricingResult(null);
    try {
      const lines: PricingInputLine[] = staffing
        .filter((row) => row.roleName.trim() || row.rateCardId)
        .map((row) => ({
          roleName: row.roleName.trim() || 'Unnamed role',
          level: row.level || undefined,
          rateCardId: row.rateCardId || null,
          manMonths: Number(row.manMonths),
          monthlyRateOverride: row.monthlyRateOverride.trim() === '' ? null : Number(row.monthlyRateOverride)
        }));
      const result = await rateCardService.calculatePricing({
        currency: quoteCurrency.trim().toUpperCase() || 'USD',
        proposalId: apply && proposalId ? proposalId : proposalId || null,
        apply,
        lines
      });
      setPricingResult(result);
      if (apply && result.proposal) {
        setNotice(`Applied ${formatMoney(result.pricing.totalCost, result.pricing.currency)} to ${result.proposal.title}.`);
        const listed = await proposalService.list({ page: 1, limit: 50 });
        setProposals(listed.proposals);
      }
    } catch (err) {
      setPricingError(err instanceof Error ? err.message : 'Pricing failed.');
    } finally {
      setIsPricing(false);
    }
  };

  const fieldClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 font-sans text-slate-900 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={onBackToOverview} className="text-xs font-mono font-bold text-brand-700 hover:underline">
              &larr; OVERVIEW
            </button>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Rate cards &amp; pricing</h1>
            <p className="mt-1 text-sm text-slate-500">
              Tenant-scoped rate cards. Arithmetic is owned by the backend, not the LLM.
            </p>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <button
                onClick={mode === 'none' ? openCreate : closeForm}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
              >
                {mode === 'none' ? 'Add rate card' : 'Close form'}
              </button>
            )}
            <button
              onClick={() => navigateTo('leads')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Leads
            </button>
          </div>
        </div>

        {!user?.organizationId && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Your account is not attached to an organization yet, so the rate-card API rejects every request.
          </p>
        )}

        {!canManage && (
          <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Your role can list cards and calculate quotations. Creating, editing or deleting cards requires ADMIN or
            PRESALE_LEAD.
          </p>
        )}

        {notice && <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
        {actionError && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p>}
        {error && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {mode !== 'none' && canManage && (
          <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
              Role name
              <input className={fieldClass} value={form.roleName} onChange={(e) => setForm({ ...form, roleName: e.target.value })} maxLength={100} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
              Level
              <select className={fieldClass} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as RateCardLevel })}>
                {RATE_CARD_LEVELS.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
              Currency
              <input className={fieldClass} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} maxLength={3} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
              Hourly
              <input className={fieldClass} value={form.hourlyRateUsd} onChange={(e) => setForm({ ...form, hourlyRateUsd: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
              Daily
              <input className={fieldClass} value={form.dailyRateUsd} onChange={(e) => setForm({ ...form, dailyRateUsd: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
              Monthly
              <input className={fieldClass} value={form.monthlyRateUsd} onChange={(e) => setForm({ ...form, monthlyRateUsd: e.target.value })} />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
            <div className="sm:col-span-2 flex items-end">
              <button
                onClick={() => void submitForm()}
                disabled={isSubmitting || !form.roleName.trim()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create card'}
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            placeholder="Filter by role name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select value={level} onChange={(e) => setLevel(e.target.value as RateCardLevel | '')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">All levels</option>
            {RATE_CARD_LEVELS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            placeholder="Currency"
            className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
            maxLength={3}
          />
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
            Include inactive
          </label>
          <button onClick={reload} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            Reload
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-mono font-bold text-slate-500">
              <tr>
                <th className="px-3 py-2">ROLE</th>
                <th className="px-3 py-2">LEVEL</th>
                <th className="px-3 py-2">MONTHLY</th>
                <th className="px-3 py-2">DAILY</th>
                <th className="px-3 py-2">HOURLY</th>
                <th className="px-3 py-2">CCY</th>
                <th className="px-3 py-2">STATUS</th>
                <th className="px-3 py-2">UPDATED</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="px-3 py-6 text-slate-400" colSpan={9}>Loading…</td></tr>
              ) : rateCards.length === 0 ? (
                <tr><td className="px-3 py-6 text-slate-400" colSpan={9}>No rate cards match these filters.</td></tr>
              ) : (
                rateCards.map((card) => (
                  <tr key={card.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-800">{card.roleName}</div>
                      <div className="truncate font-mono text-[10px] text-slate-400">{card.id}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{card.level}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatMoney(card.monthlyRateUsd, card.currency)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatMoney(card.dailyRateUsd, card.currency)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatMoney(card.hourlyRateUsd, card.currency)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{card.currency}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${card.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {card.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{formatDateTime(card.updatedAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => pinCard(card)} className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50">
                          Pin
                        </button>
                        {canManage && (
                          <>
                            <button onClick={() => openEdit(card)} className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50">
                              Edit
                            </button>
                            {confirmDeleteId === card.id ? (
                              <button onClick={() => void removeCard(card)} className="rounded bg-rose-600 px-2 py-1 text-[10px] font-bold text-white">
                                Confirm
                              </button>
                            ) : (
                              <button onClick={() => setConfirmDeleteId(card.id)} className="rounded border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-600">
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2 mb-8 flex items-center justify-end gap-2 text-xs text-slate-500">
          <span className="mr-auto font-mono">{meta ? `${meta.total} cards • page ${meta.page}/${totalPages}` : ''}</span>
          <button disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">
            Prev
          </button>
          <button disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => p + 1)} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">
            Next
          </button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-900">Quotation calculator</h2>
          <p className="mt-1 text-sm text-slate-500">
            Monthly wins, else daily × 21, else hourly × 8 × 21. A monthly override marks the line MANUAL_OVERRIDE.
          </p>

          <div className="mt-4 space-y-2">
            {staffing.map((row, index) => (
              <div key={index} className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-12">
                <input
                  className={`${fieldClass} sm:col-span-3`}
                  placeholder="Role name"
                  value={row.roleName}
                  onChange={(e) => setStaffing((rows) => rows.map((item, i) => (i === index ? { ...item, roleName: e.target.value } : item)))}
                />
                <select
                  className={`${fieldClass} sm:col-span-2`}
                  value={row.level}
                  onChange={(e) => setStaffing((rows) => rows.map((item, i) => (i === index ? { ...item, level: e.target.value as RateCardLevel | '' } : item)))}
                >
                  <option value="">Any level</option>
                  {RATE_CARD_LEVELS.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <select
                  className={`${fieldClass} sm:col-span-3`}
                  value={row.rateCardId}
                  onChange={(e) => setStaffing((rows) => rows.map((item, i) => (i === index ? { ...item, rateCardId: e.target.value } : item)))}
                >
                  <option value="">Resolve by name</option>
                  {rateCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.roleName} · {card.level} · {card.currency}
                    </option>
                  ))}
                </select>
                <input
                  className={`${fieldClass} sm:col-span-1`}
                  placeholder="MM"
                  value={row.manMonths}
                  onChange={(e) => setStaffing((rows) => rows.map((item, i) => (i === index ? { ...item, manMonths: e.target.value } : item)))}
                />
                <input
                  className={`${fieldClass} sm:col-span-2`}
                  placeholder="Override"
                  value={row.monthlyRateOverride}
                  onChange={(e) => setStaffing((rows) => rows.map((item, i) => (i === index ? { ...item, monthlyRateOverride: e.target.value } : item)))}
                />
                <button
                  className="sm:col-span-1 rounded border border-slate-200 text-xs font-bold text-slate-500"
                  onClick={() => setStaffing((rows) => (rows.length === 1 ? [emptyStaffingRow()] : rows.filter((_, i) => i !== index)))}
                >
                  Remove
                </button>
              </div>
            ))}
            <button onClick={() => setStaffing((rows) => [...rows, emptyStaffingRow()])} className="text-xs font-bold text-brand-700 hover:underline">
              + Add staffing line
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              Currency
              <input className={`${fieldClass} w-20 uppercase`} value={quoteCurrency} onChange={(e) => setQuoteCurrency(e.target.value)} maxLength={3} />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              Proposal
              <select className={fieldClass} value={proposalId} onChange={(e) => setProposalId(e.target.value)}>
                <option value="">None (preview only)</option>
                {proposals.map((proposal) => (
                  <option key={proposal.id} value={proposal.id}>
                    {proposal.title} ({formatMoney(proposal.totalCost, proposal.currency)})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={applyToProposal} onChange={(e) => setApplyToProposal(e.target.checked)} disabled={!proposalId} />
              Apply to proposal
            </label>
            <button
              onClick={() => void runPricing(false)}
              disabled={isPricing}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {isPricing ? 'Calculating…' : 'Calculate'}
            </button>
            <button
              onClick={() => void runPricing(true)}
              disabled={isPricing || !proposalId || !applyToProposal}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Apply
            </button>
          </div>

          {pricingError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{pricingError}</p>}

          {pricingResult && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <div className="flex flex-wrap gap-4 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-mono">
                <span>Total {formatMoney(pricingResult.pricing.totalCost, pricingResult.pricing.currency)}</span>
                <span>{pricingResult.pricing.totalEffortManMonths} man-months</span>
                <span>{pricingResult.pricing.billableDaysPerMonth} days/month</span>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-mono font-bold text-slate-500">
                  <tr>
                    <th className="px-3 py-2">ROLE</th>
                    <th className="px-3 py-2">LEVEL</th>
                    <th className="px-3 py-2">MM</th>
                    <th className="px-3 py-2">MONTHLY</th>
                    <th className="px-3 py-2">LINE TOTAL</th>
                    <th className="px-3 py-2">SOURCE</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingResult.pricing.lines.map((line, index) => (
                    <tr key={`${line.roleName}-${index}`} className="border-t border-slate-100">
                      <td className="px-3 py-2">{line.roleName}</td>
                      <td className="px-3 py-2 font-mono text-xs">{line.level ?? '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{line.manMonths}</td>
                      <td className="px-3 py-2 font-mono text-xs">{formatMoney(line.monthlyRate, pricingResult.pricing.currency)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{formatMoney(line.totalCost, pricingResult.pricing.currency)}</td>
                      <td className="px-3 py-2 font-mono text-[10px]">{line.rateSource}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
