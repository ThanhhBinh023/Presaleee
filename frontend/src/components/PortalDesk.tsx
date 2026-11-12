import React, { useEffect, useState } from 'react';
import { LayoutGrid, FileText, Sparkles, Zap, Globe, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProposalDirectory } from '../hooks/useProposalDirectory';
import { proposalService } from '../services/proposalService';
import { portalStaffService } from '../services/portalService';
import { navigateTo, readHashQuery } from '../navigation';
import { formatDateTime } from '../utils/format';
import { PORTAL_FIRST_SHARE_ROLES, PORTAL_MANAGER_ROLES } from '../types/portal';
import type { PortalMaterialDetail, PortalSessionCreated, PortalSessionDetail } from '../types/portal';
import type { ProposalRecord, ProposalStatus } from '../types/proposal';
import { WorkspacePill } from './workspace/WorkspacePill';
import { UserCard } from './workspace/UserCard';

interface PortalDeskProps {
  onBackToOverview?: () => void;
  onLogout?: () => void;
}

const SHAREABLE: ProposalStatus[] = ['APPROVED', 'SENT_TO_CLIENT', 'ACCEPTED'];

function statusClass(status: ProposalStatus): string {
  if (status === 'ACCEPTED' || status === 'APPROVED') return 'bg-emerald-50 text-emerald-700';
  if (status === 'REJECTED') return 'bg-rose-50 text-rose-700';
  if (status === 'IN_REVIEW' || status === 'SENT_TO_CLIENT') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

export const PortalDesk: React.FC<PortalDeskProps> = ({ onBackToOverview, onLogout }) => {
  const { user, logout } = useAuth();
  const handleLogout = onLogout || logout;
  const canManage = Boolean(user && (PORTAL_MANAGER_ROLES as readonly string[]).includes(user.role));
  const canFirstShare = Boolean(user && (PORTAL_FIRST_SHARE_ROLES as readonly string[]).includes(user.role));

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { proposals, meta, isLoading, error, reload } = useProposalDirectory({
    page,
    limit: 20,
    search: search || undefined
  });

  const [selected, setSelected] = useState<ProposalRecord | null>(null);
  const [sessions, setSessions] = useState<PortalSessionDetail[]>([]);
  const [materials, setMaterials] = useState<PortalMaterialDetail[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('168');
  const [issued, setIssued] = useState<PortalSessionCreated | null>(null);

  const [matTitle, setMatTitle] = useState('');
  const [matFileName, setMatFileName] = useState('');
  const [matFileUrl, setMatFileUrl] = useState('https://');
  const [matDescription, setMatDescription] = useState('');
  const [matMime, setMatMime] = useState('application/pdf');
  const [matShared, setMatShared] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const loadPortal = async (proposal: ProposalRecord, announce?: string) => {
    setSelected(proposal);
    setIsWorking(true);
    setActionError(null);
    if (announce) setNotice(announce);
    navigateTo('portal', { proposalId: proposal.id });
    try {
      const [sessionResult, materialResult] = await Promise.all([
        portalStaffService.listSessions(proposal.id),
        portalStaffService.listMaterials(proposal.id)
      ]);
      setSessions(sessionResult.sessions);
      setMaterials(materialResult.materials);
    } catch (err) {
      setSessions([]);
      setMaterials([]);
      setActionError(err instanceof Error ? err.message : 'Failed to load portal data.');
    } finally {
      setIsWorking(false);
    }
  };

  useEffect(() => {
    const proposalId = readHashQuery().get('proposalId');
    if (!proposalId || selected?.id === proposalId) return;
    const match = proposals.find((row) => row.id === proposalId);
    if (match) {
      void loadPortal(match);
      return;
    }
    void proposalService.getById(proposalId).then((proposal) => void loadPortal(proposal)).catch((err) => {
      setActionError(err instanceof Error ? err.message : 'Failed to load the proposal.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals]);

  const createSession = async () => {
    if (!selected) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const hours = Number(expiresInHours);
      const created = await portalStaffService.createSession({
        proposalId: selected.id,
        clientEmail: clientEmail.trim(),
        clientName: clientName.trim() || undefined,
        expiresInHours: Number.isFinite(hours) ? hours : undefined
      });
      setIssued(created);
      setNotice('Access token is shown once. Copy it now — later lists never include the credential.');
      setClientEmail('');
      setClientName('');
      reload();
      await loadPortal({ ...selected, status: selected.status === 'APPROVED' ? 'SENT_TO_CLIENT' : selected.status });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create the portal session.');
    } finally {
      setIsWorking(false);
    }
  };

  const revoke = async (sessionId: string) => {
    if (!selected) return;
    setIsWorking(true);
    setActionError(null);
    try {
      await portalStaffService.revokeSession(sessionId);
      setNotice('Session revoked. The token stops authenticating immediately.');
      await loadPortal(selected);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Revoke failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const createMaterial = async () => {
    if (!selected) return;
    setIsWorking(true);
    setActionError(null);
    try {
      await portalStaffService.createMaterial(selected.id, {
        title: matTitle.trim(),
        fileName: matFileName.trim(),
        fileUrl: matFileUrl.trim(),
        description: matDescription.trim() || undefined,
        mimeType: matMime.trim() || undefined,
        isShared: matShared
      });
      setNotice('Material created. The 201 body omits isShared — the list below is the source of truth.');
      setMatTitle('');
      setMatFileName('');
      setMatDescription('');
      await loadPortal(selected);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create the material.');
    } finally {
      setIsWorking(false);
    }
  };

  const removeMaterial = async (materialId: string) => {
    if (!selected) return;
    setIsWorking(true);
    setActionError(null);
    try {
      await portalStaffService.deleteMaterial(selected.id, materialId);
      setNotice('Material deleted.');
      await loadPortal(selected);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const shareable = selected ? SHAREABLE.includes(selected.status) : false;
  const firstShareBlocked = selected?.status === 'APPROVED' && !canFirstShare;
  const totalPages = meta?.totalPages ?? 1;

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

            <button
              onClick={() => navigateTo('leads')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <Zap className="w-4 h-4 text-slate-400" />
              <span>Leads</span>
            </button>

            {/* Active Client portal */}
            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 text-white shadow-sm shadow-brand-500/30 transition-all">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-white" />
                <span>Client portal</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-brand-600 text-white">
                Active
              </span>
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
        <div className="mx-auto max-w-7xl w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={onBackToOverview} className="text-xs font-mono font-bold text-brand-700 hover:underline">
              &larr; OVERVIEW
            </button>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Client portal desk</h1>
            <p className="mt-1 text-sm text-slate-500">
              Staff sessions and materials. First share of an APPROVED proposal requires ADMIN or PRESALE_LEAD and flips status to SENT_TO_CLIENT.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigateTo('proposals')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              Proposals
            </button>
            <button onClick={() => navigateTo('client-portal')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              Open client view
            </button>
          </div>
        </div>

        {!user?.organizationId && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Your account needs an organization before portal APIs will accept requests.
          </p>
        )}
        {!canManage && (
          <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            VIEWER can list sessions and materials (emails included). Writes return 403.
          </p>
        )}

        {notice && <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
        {actionError && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p>}
        {error && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {issued && (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <div className="text-[10px] font-mono font-bold uppercase text-amber-800">Access token (once)</div>
            <p className="mt-1 break-all font-mono text-xs text-slate-800">{issued.accessToken}</p>
            <p className="mt-1 text-xs text-slate-600">
              {issued.clientEmail} · expires {formatDateTime(issued.expiresAt)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => void navigator.clipboard.writeText(issued.accessToken)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Copy token
              </button>
              <button
                onClick={() => {
                  const clientUrl = `${window.location.origin}${window.location.pathname}#client-portal?proposalId=${issued.proposalId}&token=${issued.accessToken}`;
                  void navigator.clipboard.writeText(clientUrl);
                  setNotice('Đã copy đường link Client Portal vào clipboard!');
                }}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Copy client link
              </button>
              <button
                onClick={() => navigateTo('client-portal', { proposalId: issued.proposalId, token: issued.accessToken })}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
              >
                Open as client
              </button>
              <button onClick={() => setIssued(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600">
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search proposal title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button onClick={reload} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600">Reload</button>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-mono font-bold text-slate-500">
                <tr>
                  <th className="px-3 py-2">TITLE</th>
                  <th className="px-3 py-2">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="px-3 py-6 text-slate-400" colSpan={2}>Loading…</td></tr>
                ) : proposals.length === 0 ? (
                  <tr><td className="px-3 py-6 text-slate-400" colSpan={2}>No proposals match these filters.</td></tr>
                ) : (
                  proposals.map((proposal) => (
                    <tr
                      key={proposal.id}
                      className={`cursor-pointer border-t border-slate-100 hover:bg-emerald-50/40 ${selected?.id === proposal.id ? 'bg-emerald-50/70' : ''}`}
                      onClick={() => void loadPortal(proposal)}
                    >
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-800">{proposal.title}</div>
                        <div className="font-mono text-[10px] text-slate-400">{proposal.version}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${statusClass(proposal.status)}`}>{proposal.status}</span>
                      </td>
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

          <div className="lg:col-span-8 space-y-4">
            {!selected ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                Select an APPROVED / SENT_TO_CLIENT / ACCEPTED proposal. DRAFT and IN_REVIEW cannot be shared (409).
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold">{selected.title}</h2>
                      <p className="font-mono text-[10px] text-slate-400">{selected.id}</p>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${statusClass(selected.status)}`}>{selected.status}</span>
                  </div>
                  {!shareable && (
                    <p className="mt-3 text-sm text-rose-700">Only APPROVED, SENT_TO_CLIENT, or ACCEPTED proposals accept sessions and materials.</p>
                  )}
                  {firstShareBlocked && (
                    <p className="mt-3 text-sm text-amber-800">SALES_REP / SOLUTION_ARCHITECT cannot create the first session on APPROVED. Use ADMIN or PRESALE_LEAD.</p>
                  )}

                  {canManage && shareable && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="client@company.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Client name (optional)" value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={200} />
                      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="expiresInHours 1–720" value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)} />
                      <button onClick={() => void createSession()} disabled={isWorking || !clientEmail.trim() || firstShareBlocked} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                        Create session
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold">Sessions ({sessions.length})</div>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] font-mono font-bold text-slate-500">
                      <tr>
                        <th className="px-3 py-2">CLIENT</th>
                        <th className="px-3 py-2">EXPIRES</th>
                        <th className="px-3 py-2">LAST ACCESS</th>
                        <th className="px-3 py-2">COMMENTS</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.length === 0 ? (
                        <tr><td className="px-3 py-4 text-slate-400" colSpan={5}>No sessions.</td></tr>
                      ) : (
                        sessions.map((session) => (
                          <tr key={session.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              <div className="font-bold">{session.clientName || session.clientEmail}</div>
                              <div className="font-mono text-[10px] text-slate-400">{session.clientEmail}</div>
                              {session.revokedAt && <div className="text-[10px] font-bold text-rose-600">REVOKED {formatDateTime(session.revokedAt)}</div>}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{formatDateTime(session.expiresAt)}</td>
                            <td className="px-3 py-2 font-mono text-xs">{formatDateTime(session.lastAccessedAt)}</td>
                            <td className="px-3 py-2 font-mono text-xs">{session.commentCount}</td>
                            <td className="px-3 py-2 text-right">
                              {canManage && !session.revokedAt && (
                                <button onClick={() => void revoke(session.id)} disabled={isWorking} className="text-xs font-bold text-rose-600 disabled:opacity-50">
                                  Revoke
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-3 text-sm font-bold">Materials ({materials.length})</div>
                  {canManage && shareable && (
                    <div className="mb-4 grid gap-2 sm:grid-cols-2">
                      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Title" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} maxLength={255} />
                      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="fileName.pdf" value={matFileName} onChange={(e) => setMatFileName(e.target.value)} maxLength={255} />
                      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" placeholder="https://…" value={matFileUrl} onChange={(e) => setMatFileUrl(e.target.value)} />
                      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Description" value={matDescription} onChange={(e) => setMatDescription(e.target.value)} maxLength={4000} />
                      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="mimeType" value={matMime} onChange={(e) => setMatMime(e.target.value)} maxLength={150} />
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" checked={matShared} onChange={(e) => setMatShared(e.target.checked)} />
                        Share with client (default off)
                      </label>
                      <button onClick={() => void createMaterial()} disabled={isWorking || !matTitle.trim() || !matFileName.trim()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                        Add material
                      </button>
                    </div>
                  )}
                  <ul className="space-y-2 text-sm">
                    {materials.length === 0 ? (
                      <li className="text-slate-400">No materials.</li>
                    ) : (
                      materials.map((material) => (
                        <li key={material.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
                          <div>
                            <div className="font-bold">{material.title}</div>
                            <div className="font-mono text-[10px] text-slate-400">{material.fileName} · {material.isShared ? 'SHARED' : 'STAFF ONLY'}</div>
                            <a href={material.fileUrl} className="text-xs text-brand-700 underline" target="_blank" rel="noreferrer">{material.fileUrl}</a>
                          </div>
                          {canManage && (
                            <button onClick={() => void removeMaterial(material.id)} disabled={isWorking} className="text-xs font-bold text-rose-600">
                              Delete
                            </button>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
