import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProposalDirectory } from '../hooks/useProposalDirectory';
import { useLeadDirectory } from '../hooks/useLeadDirectory';
import { proposalService } from '../services/proposalService';
import { ApiError } from '../services/apiClient';
import { navigateTo, readHashQuery } from '../navigation';
import { formatDateTime, formatMoney } from '../utils/format';
import {
  PRIVILEGED_PROPOSAL_STATUSES,
  PROPOSAL_STATUSES,
  PROPOSAL_TRANSITIONS,
  STANDARD_PROPOSAL_SHEETS
} from '../types/proposal';
import type { GenerateSheetsResult, ProposalStatus, ProposalWithSheets } from '../types/proposal';

const PAGE_SIZE = 20;

interface ProposalsStudioProps {
  onBackToOverview: () => void;
}

function statusClass(status: ProposalStatus): string {
  if (status === 'ACCEPTED' || status === 'APPROVED') return 'bg-emerald-50 text-emerald-700';
  if (status === 'REJECTED') return 'bg-rose-50 text-rose-700';
  if (status === 'IN_REVIEW' || status === 'SENT_TO_CLIENT') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

export const ProposalsStudio: React.FC<ProposalsStudioProps> = ({ onBackToOverview }) => {
  const { user } = useAuth();
  const canPrivilege = user?.role === 'ADMIN' || user?.role === 'PRESALE_LEAD';

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProposalStatus | ''>('');
  const [page, setPage] = useState(1);

  const [createTitle, setCreateTitle] = useState('');
  const [createCurrency, setCreateCurrency] = useState('USD');
  const [createLeadId, setCreateLeadId] = useState('');

  const [detail, setDetail] = useState<ProposalWithSheets | null>(null);
  const [sheetName, setSheetName] = useState<string>(STANDARD_PROPOSAL_SHEETS[0].name);
  const [sheetJson, setSheetJson] = useState('{}');
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [currency, setCurrency] = useState('USD');
  const [instructions, setInstructions] = useState('');
  const [sources, setSources] = useState<GenerateSheetsResult['sources']>([]);

  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { proposals, meta, isLoading, error, reload } = useProposalDirectory({
    page,
    limit: PAGE_SIZE,
    status: status || undefined,
    search: search || undefined
  });
  const { leads } = useLeadDirectory({ page: 1, limit: 100 });

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const loadProposal = async (id: string, announce?: string) => {
    setIsWorking(true);
    setActionError(null);
    setConfirmDelete(false);
    if (announce) setNotice(announce);
    try {
      const proposal = await proposalService.getById(id);
      setDetail(proposal);
      setTitle(proposal.title);
      setVersion(proposal.version);
      setCurrency(proposal.currency);
      const preferred =
        proposal.sheets.find((sheet) => sheet.sheetName === sheetName)?.sheetName ??
        proposal.sheets[0]?.sheetName ??
        STANDARD_PROPOSAL_SHEETS[0].name;
      setSheetName(preferred);
      const sheet = proposal.sheets.find((item) => item.sheetName === preferred);
      setSheetJson(JSON.stringify(sheet?.sheetData ?? {}, null, 2));
      navigateTo('proposals', { id: proposal.id });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to load the proposal.');
    } finally {
      setIsWorking(false);
    }
  };

  useEffect(() => {
    const id = readHashQuery().get('id');
    if (id) void loadProposal(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectSheet = (name: string) => {
    if (!detail) return;
    setSheetName(name);
    const sheet = detail.sheets.find((item) => item.sheetName === name);
    setSheetJson(JSON.stringify(sheet?.sheetData ?? {}, null, 2));
  };

  const createProposal = async () => {
    setIsWorking(true);
    setActionError(null);
    try {
      const created = await proposalService.create({
        title: createTitle.trim(),
        currency: createCurrency.trim().toUpperCase() || 'USD',
        leadId: createLeadId || null
      });
      setCreateTitle('');
      setNotice(`Created ${created.title} with ${created.sheets.length} sheets.`);
      reload();
      await loadProposal(created.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Create failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const saveMetadata = async () => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const patch: { title?: string; version?: string; currency?: string } = {};
      if (title.trim() !== detail.title) patch.title = title.trim();
      if (version.trim() !== detail.version) patch.version = version.trim();
      if (currency.trim().toUpperCase() !== detail.currency) patch.currency = currency.trim().toUpperCase();
      if (Object.keys(patch).length === 0) {
        setActionError('Nothing to save — change title, version or currency.');
        return;
      }
      await proposalService.updateMetadata(detail.id, patch);
      await loadProposal(detail.id, 'Metadata saved.');
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Metadata save failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const saveSheet = async () => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const parsed = JSON.parse(sheetJson) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setActionError('sheetData must be a JSON object.');
        return;
      }
      await proposalService.updateSheet(detail.id, sheetName, parsed as Record<string, unknown>);
      await loadProposal(detail.id, `Saved sheet ${sheetName}.`);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Sheet save failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const generateCurrent = async () => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const result = await proposalService.generateSheet(detail.id, sheetName, instructions || undefined);
      setSources(result.sources ?? []);
      await loadProposal(detail.id, `Generated ${sheetName}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed.';
      setActionError(
        err instanceof ApiError && (err.status === 502 || err.status === 0)
          ? `${message} Start the AI service on port 8000. Generation is DRAFT-only.`
          : message
      );
    } finally {
      setIsWorking(false);
    }
  };

  const generateAll = async () => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const result = await proposalService.generate(detail.id, { instructions: instructions || undefined });
      setSources(result.sources ?? []);
      await loadProposal(detail.id, 'Generated all sheets that the model returned.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed.';
      setActionError(
        err instanceof ApiError && (err.status === 502 || err.status === 0)
          ? `${message} Start the AI service on port 8000.`
          : message
      );
    } finally {
      setIsWorking(false);
    }
  };

  const changeStatus = async (next: ProposalStatus) => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      if (next === 'IN_REVIEW' && detail.status === 'DRAFT') {
        await proposalService.submitForReview(detail.id);
      } else {
        await proposalService.updateStatus(detail.id, next);
      }
      await loadProposal(detail.id, `Status is now ${next}.`);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Status change failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const exportFile = async (kind: 'excel' | 'pdf') => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      if (kind === 'excel') await proposalService.exportExcel(detail.id);
      else await proposalService.exportPdf(detail.id);
      setNotice(`Downloaded ${kind === 'excel' ? 'Excel' : 'PDF'} export.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const removeProposal = async () => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      await proposalService.delete(detail.id);
      setNotice('Proposal deleted. Sheets cascaded.');
      setDetail(null);
      setConfirmDelete(false);
      navigateTo('proposals');
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const totalPages = meta?.totalPages ?? 1;
  const isDraft = detail?.status === 'DRAFT';
  const allowedNext = detail ? PROPOSAL_TRANSITIONS[detail.status] : [];
  const currentSheet = detail?.sheets.find((sheet) => sheet.sheetName === sheetName);

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 font-sans text-slate-900 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={onBackToOverview} className="text-xs font-mono font-bold text-brand-700 hover:underline">
              &larr; OVERVIEW
            </button>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Proposal studio</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ten standard sheets. Sheet edits and AI generation are DRAFT-only. Submit-review writes an audit row.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigateTo('meetings')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              Meetings
            </button>
            <button onClick={() => navigateTo('rate-cards')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              Rate cards
            </button>
            <button onClick={() => navigateTo('portal')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              Client portal
            </button>
          </div>
        </div>

        {!user?.organizationId && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Your account needs an organization before proposal APIs will accept requests.
          </p>
        )}

        {notice && <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
        {actionError && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p>}
        {error && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="mb-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" placeholder="New proposal title" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} maxLength={255} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase" value={createCurrency} onChange={(e) => setCreateCurrency(e.target.value)} maxLength={3} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={createLeadId} onChange={(e) => setCreateLeadId(e.target.value)}>
            <option value="">No linked lead</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.title} ({lead.status})
              </option>
            ))}
          </select>
          <button onClick={() => void createProposal()} disabled={isWorking || !createTitle.trim()} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-4">
            Create DRAFT (10 empty sheets)
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value as ProposalStatus | '')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {PROPOSAL_STATUSES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <button onClick={reload} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600">Reload</button>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-mono font-bold text-slate-500">
                <tr>
                  <th className="px-3 py-2">TITLE</th>
                  <th className="px-3 py-2">STATUS</th>
                  <th className="px-3 py-2">COST</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="px-3 py-6 text-slate-400" colSpan={3}>Loading…</td></tr>
                ) : proposals.length === 0 ? (
                  <tr><td className="px-3 py-6 text-slate-400" colSpan={3}>No proposals match these filters.</td></tr>
                ) : (
                  proposals.map((proposal) => (
                    <tr
                      key={proposal.id}
                      className={`cursor-pointer border-t border-slate-100 hover:bg-emerald-50/40 ${detail?.id === proposal.id ? 'bg-emerald-50/70' : ''}`}
                      onClick={() => void loadProposal(proposal.id)}
                    >
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-800">{proposal.title}</div>
                        <div className="font-mono text-[10px] text-slate-400">{proposal.version} · {formatDateTime(proposal.updatedAt)}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${statusClass(proposal.status)}`}>{proposal.status}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{formatMoney(proposal.totalCost, proposal.currency)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              <span className="mr-auto font-mono">{meta ? `${meta.total} · page ${meta.page}/${totalPages}` : ''}</span>
              <button disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border px-2 py-1 disabled:opacity-40">Prev</button>
              <button disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => p + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>

          <div className="lg:col-span-8">
            {!detail ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                Select or create a proposal. Linked-lead creates also live on the lead page when the lead is QUALIFIED / APPROVED / PROPOSAL_DRAFTING.
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold">{detail.title}</h2>
                    <p className="font-mono text-[10px] text-slate-400">
                      {detail.id} · {detail.sheets.length} sheets · timeline {detail.estimatedTimelineWeeks ?? '—'} weeks
                    </p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${statusClass(detail.status)}`}>{detail.status}</span>
                </div>
                {(detail.status === 'APPROVED' || detail.status === 'SENT_TO_CLIENT' || detail.status === 'ACCEPTED') && (
                  <button
                    onClick={() => navigateTo('portal', { proposalId: detail.id })}
                    className="rounded-lg border border-brand-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-brand-700"
                  >
                    Share in client portal
                  </button>
                )}

                <div className="grid gap-2 sm:grid-cols-3">
                  <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isDraft} />
                  <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={version} onChange={(e) => setVersion(e.target.value)} disabled={!isDraft} maxLength={20} />
                  <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!isDraft} maxLength={3} />
                </div>
                <button onClick={() => void saveMetadata()} disabled={isWorking || !isDraft} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  Save metadata
                </button>

                <div className="flex flex-wrap gap-1">
                  {allowedNext.map((next) => {
                    const privileged = PRIVILEGED_PROPOSAL_STATUSES.includes(next);
                    const blocked = privileged && !canPrivilege;
                    return (
                      <button
                        key={next}
                        disabled={isWorking || blocked}
                        onClick={() => void changeStatus(next)}
                        title={blocked ? 'ADMIN or PRESALE_LEAD required' : undefined}
                        className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        {next === 'IN_REVIEW' && detail.status === 'DRAFT' ? 'Submit for review' : next}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-1">
                  {STANDARD_PROPOSAL_SHEETS.map((sheet) => (
                    <button
                      key={sheet.name}
                      onClick={() => selectSheet(sheet.name)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        sheetName === sheet.name ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {sheet.order}. {sheet.name}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-mono text-slate-400">
                  {currentSheet ? `${currentSheet.sheetName} · aiGenerated=${String(currentSheet.aiGenerated)}` : 'Sheet not stored yet — Save will upsert.'}
                </p>

                <textarea
                  className="min-h-[260px] w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs disabled:bg-slate-50"
                  value={sheetJson}
                  onChange={(e) => setSheetJson(e.target.value)}
                  disabled={!isDraft || isWorking}
                />
                <button onClick={() => void saveSheet()} disabled={isWorking || !isDraft} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  Save sheet JSON
                </button>

                <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                  Generation instructions (optional, max 4000)
                  <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" value={instructions} onChange={(e) => setInstructions(e.target.value)} disabled={!isDraft} maxLength={4000} />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void generateCurrent()} disabled={isWorking || !isDraft} className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    AI generate this sheet
                  </button>
                  <button onClick={() => void generateAll()} disabled={isWorking || !isDraft} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">
                    Generate all 10
                  </button>
                  <button onClick={() => void exportFile('excel')} disabled={isWorking} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600">
                    Export Excel
                  </button>
                  <button onClick={() => void exportFile('pdf')} disabled={isWorking} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600">
                    Export PDF
                  </button>
                </div>

                {sources.length > 0 && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-[10px] font-mono font-bold uppercase text-slate-400">RAG sources</div>
                    <ul className="mt-1 space-y-1 text-xs text-slate-600">
                      {sources.map((source) => (
                        <li key={source.id}>
                          <span className="font-semibold">{source.title ?? source.id}</span>
                          {source.excerpt ? ` — ${source.excerpt.slice(0, 160)}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {confirmDelete ? (
                  <button onClick={() => void removeProposal()} className="w-full rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">
                    Confirm delete (sheets cascade)
                  </button>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="w-full rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600">
                    Delete proposal
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
