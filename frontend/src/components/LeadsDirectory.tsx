import { Sparkles, LayoutGrid, FileText, Zap, Globe, Settings } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLeadDirectory } from '../hooks/useLeadDirectory';
import { useClientDirectory } from '../hooks/useClientDirectory';
import { useMemberDirectory } from '../hooks/useMemberDirectory';
import { leadService } from '../services/leadService';
import { ApiError } from '../services/apiClient';
import { navigateTo, readHashQuery } from '../navigation';
import { formatDateTime } from '../utils/format';
import { WorkspacePill } from './workspace/WorkspacePill';
import { UserCard } from './workspace/UserCard';
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_TRANSITIONS,
  PROPOSAL_ELIGIBLE_STATUSES,
  isLeadQualification
} from '../types/lead';
import type { LeadMeeting, LeadQualification, LeadRecord, LeadSource, LeadStatus } from '../types/lead';

const PAGE_SIZE = 20;

function statusClass(status: LeadStatus): string {
  if (status === 'WON' || status === 'QUALIFIED' || status === 'APPROVED') return 'bg-emerald-50 text-emerald-700';
  if (status === 'LOST' || status === 'REJECTED') return 'bg-rose-50 text-rose-700';
  return 'bg-amber-50 text-amber-700';
}

function qualificationFromLead(lead: LeadRecord): LeadQualification | null {
  return isLeadQualification(lead.bantDetails) ? lead.bantDetails : null;
}

interface LeadsDirectoryProps {
  onBackToOverview?: () => void;
  onLogout?: () => void;
}

export const LeadsDirectory: React.FC<LeadsDirectoryProps> = ({ onBackToOverview, onLogout }) => {
  const { user, logout } = useAuth();
  const handleLogout = onLogout || logout;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [source, setSource] = useState<LeadSource | ''>('');
  const [page, setPage] = useState(1);
  const [pipelineTab, setPipelineTab] = useState<'all' | 'in_process' | 'complete'>('all');

  const IN_PROCESS_STATUSES: LeadStatus[] = ['NEW', 'IN_REVIEW', 'QUALIFYING', 'QUALIFIED', 'PROPOSAL_DRAFTING', 'APPROVED'];
  const COMPLETE_STATUSES: LeadStatus[] = ['WON', 'LOST', 'REJECTED'];

  const [detail, setDetail] = useState<LeadRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [clientId, setClientId] = useState('');
  const [rawRfp, setRawRfp] = useState('');

  const [meetings, setMeetings] = useState<LeadMeeting[]>([]);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [qualification, setQualification] = useState<LeadQualification | null>(null);

  const { leads, meta, isLoading, error, reload } = useLeadDirectory({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: status || undefined,
    source: source || undefined
  });
  const clients = useClientDirectory({ page: 1, limit: 100 });
  const members = useMemberDirectory({ page: 1, limit: 50 });

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, status, source]);

  const openDetail = async (id: string, announce?: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setActionError(null);
    setConfirmDelete(false);
    if (announce) setNotice(announce);
    try {
      const lead = await leadService.getLead(id);
      setDetail(lead);
      setTitle(lead.title);
      setAssignedTo(lead.assignedTo ?? '');
      setClientId(lead.clientId ?? '');
      setRawRfp(lead.rawRfpContent);
      setQualification(qualificationFromLead(lead));
      try {
        setMeetings(await leadService.listMeetings(id));
      } catch {
        setMeetings([]);
      }
      navigateTo('leads', { id });
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load the lead.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const id = readHashQuery().get('id');
    if (id) void openDetail(id);
    // Open from deep link once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeDetail = () => {
    setDetail(null);
    setQualification(null);
    setMeetings([]);
    navigateTo('leads');
  };

  const saveLead = async () => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const patch: Parameters<typeof leadService.updateLead>[1] = {};
      if (title.trim() !== detail.title) patch.title = title.trim();
      if (rawRfp.trim() !== detail.rawRfpContent) patch.rawRfpContent = rawRfp.trim();
      const nextClient = clientId || null;
      if (nextClient !== detail.clientId) patch.clientId = nextClient;
      const nextAssignee = assignedTo || null;
      if (nextAssignee !== detail.assignedTo) patch.assignedTo = nextAssignee;
      if (Object.keys(patch).length === 0) {
        setActionError('Nothing to save — change at least one field.');
        return;
      }
      const updated = await leadService.updateLead(detail.id, patch);
      setDetail(updated);
      setNotice('Lead saved.');
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const changeStatus = async (next: LeadStatus) => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const updated = await leadService.updateStatus(detail.id, next);
      setDetail(updated);
      setNotice(`Status is now ${updated.status}.`);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Status change failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const runQualify = async () => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const scored = await leadService.qualify(detail.id);
      setQualification(scored);
      const refreshed = await leadService.getLead(detail.id);
      setDetail(refreshed);
      setNotice(`BANT score ${scored.score}. Qualification also moves the lead to QUALIFIED.`);
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Qualification failed.';
      setActionError(
        err instanceof ApiError && (err.status === 502 || err.status === 0)
          ? `${message} Start the AI service on port 8000 to score BANT.`
          : message
      );
    } finally {
      setIsWorking(false);
    }
  };

  const createProposal = async () => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const proposal = await leadService.createProposal(detail.id);
      setNotice(`Created proposal ${proposal.title}. Opening studio…`);
      navigateTo('proposals', { id: proposal.id });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create a proposal from this lead.');
    } finally {
      setIsWorking(false);
    }
  };

  const addMeeting = async () => {
    if (!detail || !meetingTitle.trim()) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const created = await leadService.createMeeting(detail.id, {
        title: meetingTitle.trim(),
        meetingDate: meetingDate || undefined
      });
      setMeetings((current) => [created, ...current]);
      setMeetingTitle('');
      setMeetingDate('');
      setNotice('Meeting attached to this lead.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create the meeting.');
    } finally {
      setIsWorking(false);
    }
  };

  const removeLead = async () => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      await leadService.deleteLead(detail.id);
      setNotice('Lead deleted. Linked proposals keep their quotation with leadId set to null.');
      closeDetail();
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setIsWorking(false);
      setConfirmDelete(false);
    }
  };

  const totalPages = meta?.totalPages ?? 1;
  const allowedNext = detail ? LEAD_TRANSITIONS[detail.status] : [];
  const metadata = detail?.extractedMetadata ?? {};

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900 font-sans">
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm font-bold font-mono text-base">
                P
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Presaleee
              </span>
            </div>
            <WorkspacePill />
          </div>

          <nav className="p-3 space-y-1">
            <button
              onClick={onBackToOverview || (() => navigateTo('home'))}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <LayoutGrid className="w-4 h-4 text-slate-400" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => navigateTo('rfps')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>RFPs &amp; Specs</span>
            </button>

            <button
              onClick={() => navigateTo('ai-workspace')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <Sparkles className="w-4 h-4 text-slate-400" />
              <span>AI Workspace</span>
            </button>

            {/* Active Leads */}
            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 text-white shadow-sm shadow-brand-500/30 transition-all">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-white" />
                <span>Leads</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-brand-600 text-white">
                Active
              </span>
            </button>

            <button
              onClick={() => navigateTo('portal')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <Globe className="w-4 h-4 text-slate-400" />
              <span>Client portal</span>
            </button>
          </nav>
        </div>

        <div className="p-3 border-t border-slate-100 space-y-2">
          <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50">
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
          <UserCard onLogout={handleLogout} subtitle="role" />
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto px-4 py-8 md:px-10">
        <div className="mx-auto max-w-6xl w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={onBackToOverview} className="text-xs font-mono font-bold text-brand-700 hover:underline">
              &larr; OVERVIEW
            </button>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Leads</h1>
            <p className="mt-1 text-sm text-slate-500">Organization pipeline. Status changes go through the state machine, not a generic PATCH.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigateTo('rfps')} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">
              New intake
            </button>
            <button onClick={() => navigateTo('meetings')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Meetings
            </button>
            <button onClick={() => navigateTo('proposals')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Proposals
            </button>
          </div>
        </div>

        {!user?.organizationId && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Your account is not attached to an organization yet, so lead APIs return 403.
          </p>
        )}

        {notice && <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
        {error && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search title or RFP text" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value as LeadStatus | '')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value as LeadSource | '')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">All sources</option>
            {LEAD_SOURCES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <button onClick={reload} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600">Reload</button>
        </div>

        {/* Segment Tabs: In Process & Complete */}
        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
          <button
            onClick={() => setPipelineTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              pipelineTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả ({leads.length})
          </button>
          <button
            onClick={() => setPipelineTab('in_process')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              pipelineTab === 'in_process'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Đang xử lý (In Process)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              pipelineTab === 'in_process' ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-700'
            }`}>
              {leads.filter(l => IN_PROCESS_STATUSES.includes(l.status)).length}
            </span>
          </button>
          <button
            onClick={() => setPipelineTab('complete')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              pipelineTab === 'complete'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Đã hoàn thành (Complete)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              pipelineTab === 'complete' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {leads.filter(l => COMPLETE_STATUSES.includes(l.status)).length}
            </span>
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-mono font-bold text-slate-500">
                <tr>
                  <th className="px-3 py-2">TITLE</th>
                  <th className="px-3 py-2">SOURCE</th>
                  <th className="px-3 py-2">STATUS</th>
                  <th className="px-3 py-2">BANT</th>
                  <th className="px-3 py-2">UPDATED</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="px-3 py-6 text-slate-400" colSpan={5}>Loading…</td></tr>
                ) : leads.filter(l => pipelineTab === 'all' ? true : pipelineTab === 'in_process' ? IN_PROCESS_STATUSES.includes(l.status) : COMPLETE_STATUSES.includes(l.status)).length === 0 ? (
                  <tr><td className="px-3 py-6 text-slate-400" colSpan={5}>Không có dự án nào trong nhóm này.</td></tr>
                ) : (
                  leads.filter(l => pipelineTab === 'all' ? true : pipelineTab === 'in_process' ? IN_PROCESS_STATUSES.includes(l.status) : COMPLETE_STATUSES.includes(l.status)).map((lead) => (
                    <tr
                      key={lead.id}
                      className={`cursor-pointer border-t border-slate-100 hover:bg-emerald-50/40 ${detail?.id === lead.id ? 'bg-emerald-50/70' : ''}`}
                      onClick={() => void openDetail(lead.id)}
                    >
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-800">{lead.title}</div>
                        <div className="truncate font-mono text-[10px] text-slate-400">{lead.id}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{lead.source}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${statusClass(lead.status)}`}>{lead.status}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{lead.bantScore ?? '—'}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{formatDateTime(lead.updatedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              <span className="mr-auto font-mono">{meta ? `${meta.total} leads • page ${meta.page}/${totalPages}` : ''}</span>
              <button disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">Prev</button>
              <button disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => p + 1)} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {detailLoading && <p className="text-sm text-slate-400">Loading lead…</p>}
            {detailError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{detailError}</p>}
            {actionError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p>}

            {!detail && !detailLoading && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                Select a lead to inspect the full RFP, run BANT, change status, attach a meeting or spawn a proposal.
              </div>
            )}

            {detail && (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase text-slate-400">Lead detail</div>
                    <h2 className="text-lg font-bold text-slate-900">{detail.title}</h2>
                  </div>
                  <button onClick={closeDetail} className="text-xs font-bold text-slate-400 hover:text-slate-700">Close</button>
                </div>

                <button
                  onClick={() => {
                    localStorage.setItem('presaleee_active_lead_id', detail.id);
                    navigateTo('ai-workspace');
                  }}
                  className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Mở trong AI Workspace (Chấm điểm &amp; Đề xuất) &rarr;</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${statusClass(detail.status)}`}>{detail.status}</span>
                  <span className="font-mono text-[10px] text-slate-400">{detail.source}</span>
                  <span className="font-mono text-[10px] text-slate-400">BANT {detail.bantScore ?? '—'}</span>
                </div>

                <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                  Title
                  <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                  Client
                  <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                    <option value="">Unlinked</option>
                    {clients.clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.companyName}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                  Assigned to
                  <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                    <option value="">Unassigned</option>
                    {members.members.map((member) => (
                      <option key={member.id} value={member.id}>{member.fullName} ({member.role})</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                  Raw RFP
                  <textarea className="min-h-[120px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" value={rawRfp} onChange={(e) => setRawRfp(e.target.value)} />
                </label>
                <button onClick={() => void saveLead()} disabled={isWorking} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  Save fields
                </button>

                <div>
                  <div className="mb-1 text-[10px] font-mono font-bold uppercase text-slate-400">Extracted metadata</div>
                  <dl className="space-y-1 text-xs">
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Industry</dt><dd>{String(metadata.clientIndustry ?? '—')}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Budget USD</dt><dd>{String(metadata.budgetUsd ?? '—')}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Timeline weeks</dt><dd>{String(metadata.timelineWeeks ?? '—')}</dd></div>
                    <div><dt className="text-slate-500">Goal</dt><dd className="text-slate-700">{String(metadata.businessGoal ?? '—')}</dd></div>
                  </dl>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-mono font-bold uppercase text-slate-400">Status machine</div>
                  <div className="flex flex-wrap gap-1">
                    {allowedNext.length === 0 && <span className="text-xs text-slate-400">Terminal status.</span>}
                    {allowedNext.map((next) => (
                      <button
                        key={next}
                        disabled={isWorking}
                        onClick={() => void changeStatus(next)}
                        className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {next}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">APPROVED requires a stored BANT score.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void runQualify()} disabled={isWorking} className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    {isWorking ? 'Working…' : 'Run BANT qualification'}
                  </button>
                  <button
                    onClick={() => void createProposal()}
                    disabled={isWorking || !PROPOSAL_ELIGIBLE_STATUSES.includes(detail.status)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50"
                  >
                    Create proposal
                  </button>
                </div>

                {qualification && (
                  <div className="rounded-xl border border-brand-200 bg-emerald-50/60 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono font-bold text-slate-500">QUALIFICATION SCORE</div>
                        <div className="text-2xl font-extrabold font-mono text-brand-700">{qualification.score} / 100</div>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-mono font-bold text-brand-800">{qualification.recommendation}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-700">{qualification.summary}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(['budget', 'authority', 'need', 'timeline'] as const).map((key) => (
                        <div key={key} className="rounded-lg bg-white px-2 py-1.5">
                          <div className="text-[10px] font-mono uppercase text-slate-400">{key}</div>
                          <div className="font-mono text-sm font-bold">{qualification.criteria[key].score}/25</div>
                          <p className="text-[10px] text-slate-600">{qualification.criteria[key].assessment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-2 text-[10px] font-mono font-bold uppercase text-slate-400">Meetings</div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <input className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Meeting title" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} />
                    <input type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
                    <button onClick={() => void addMeeting()} disabled={isWorking || !meetingTitle.trim()} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                      Add
                    </button>
                  </div>
                  {meetings.length === 0 ? (
                    <p className="text-xs text-slate-400">No meetings on this lead.</p>
                  ) : (
                    <ul className="space-y-1 text-xs">
                      {meetings.map((meeting) => (
                        <li key={meeting.id}>
                          <button
                            type="button"
                            onClick={() => navigateTo('meetings', { leadId: detail.id, id: meeting.id })}
                            className="flex w-full justify-between gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-left hover:bg-slate-50"
                          >
                            <span className="font-semibold">{meeting.title}</span>
                            <span className="font-mono text-[10px] text-slate-400">{formatDateTime(meeting.meetingDate)} · {meeting.status}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {confirmDelete ? (
                  <button onClick={() => void removeLead()} className="w-full rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">
                    Confirm delete (proposals survive, leadId becomes null)
                  </button>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="w-full rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600">
                    Delete lead
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
