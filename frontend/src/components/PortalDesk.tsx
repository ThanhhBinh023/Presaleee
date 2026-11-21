import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProposalDirectory } from '../hooks/useProposalDirectory';
import { proposalService } from '../services/proposalService';
import { portalStaffService } from '../services/portalService';
import { navigateTo, readHashQuery } from '../navigation';
import { formatDateTime } from '../utils/format';
import type { PortalComment, PortalMaterialDetail, PortalSessionCreated, PortalSessionDetail } from '../types/portal';
import type { ProposalRecord, ProposalStatus } from '../types/proposal';
import { AppSidebar } from './workspace/AppSidebar';
import { 
  MessageSquare, 
  Clock, 
  User, 
  Mail, 
  ChevronRight, 
  X
} from 'lucide-react';

interface PortalDeskProps {
  onBackToOverview?: () => void;
  onLogout?: () => void;
}

function statusClass(status: ProposalStatus): string {
  if (status === 'ACCEPTED' || status === 'APPROVED') return 'bg-emerald-50 text-emerald-700';
  if (status === 'REJECTED') return 'bg-rose-50 text-rose-700';
  if (status === 'IN_REVIEW' || status === 'SENT_TO_CLIENT') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

export const PortalDesk: React.FC<PortalDeskProps> = ({ onBackToOverview, onLogout }) => {
  const { user, logout } = useAuth();
  const handleLogout = onLogout || logout;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { proposals, meta, isLoading, error, reload } = useProposalDirectory({
    page,
    limit: 20,
    search: search || undefined,
    presaleLeadOnly: true
  });

  const [selected, setSelected] = useState<ProposalRecord | null>(null);
  const canManage = user?.role === 'ADMIN' || user?.role === 'PRESALE_LEAD' || Boolean(selected);
  const [sessions, setSessions] = useState<PortalSessionDetail[]>([]);
  const [materials, setMaterials] = useState<PortalMaterialDetail[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [proposalComments, setProposalComments] = useState<PortalComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
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
    setSelectedSessionId(null);
    setIsWorking(true);
    setActionError(null);
    if (announce) setNotice(announce);
    navigateTo('portal', { proposalId: proposal.id });
    try {
      const [sessionResult, materialResult, commentResult] = await Promise.all([
        portalStaffService.listSessions(proposal.id),
        portalStaffService.listMaterials(proposal.id),
        portalStaffService.listComments(proposal.id)
      ]);
      setSessions(sessionResult.sessions);
      setMaterials(materialResult.materials);
      setProposalComments(commentResult.comments);
    } catch (err) {
      setSessions([]);
      setMaterials([]);
      setProposalComments([]);
      setActionError(err instanceof Error ? err.message : 'Failed to load portal data.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleSelectSession = async (session: PortalSessionDetail) => {
    if (selectedSessionId === session.id) {
      setSelectedSessionId(null);
      return;
    }
    setSelectedSessionId(session.id);
    if (selected) {
      try {
        setIsLoadingComments(true);
        const res = await portalStaffService.listComments(selected.id, session.id);
        setProposalComments((prev) => {
          const others = prev.filter((c) => c.sessionId !== session.id);
          return [...others, ...res.comments];
        });
      } catch (err) {
        console.error('Error fetching comments for session:', err);
      } finally {
        setIsLoadingComments(false);
      }
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

  // PostgresPortalRepository.createSession chỉ nhận 3 trạng thái này và tự đổi APPROVED -> SENT_TO_CLIENT.
  const shareable = Boolean(selected && ['APPROVED', 'SENT_TO_CLIENT', 'ACCEPTED'].includes(selected.status));
  const totalPages = meta?.totalPages ?? 1;
  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || null;
  const selectedSessionComments = selectedSessionId
    ? proposalComments.filter((c) => c.sessionId === selectedSessionId)
    : [];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900 font-sans">
      {/* 1. UNIFIED APP SIDEBAR */}
      <AppSidebar
        activeItem="Client portal"
        onLogout={handleLogout}
        onNavigateOverview={onBackToOverview}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto px-4 py-8 md:px-10">
        <div className="mx-auto max-w-7xl w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Client portal desk</h1>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý phiên tương tác Client Portal và tài liệu đính kèm. Trưởng dự án (Presale Lead) phê duyệt nội dung và Đại diện kinh doanh (Sales Rep) khởi tạo phiên tương tác cho khách hàng.
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
                  <tr>
                    <td className="px-3 py-6 text-slate-400 text-xs leading-relaxed" colSpan={2}>
                      Không có đề xuất nào do bạn phụ trách. Trưởng dự án (PRESALE_LEAD) và Đại diện kinh doanh (SALES_REP) của dự án mới có quyền xem và quản trị phiên Client Portal tương tác với khách hàng.
                    </td>
                  </tr>
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
                Chọn một hồ sơ đề xuất (Proposal) từ danh sách bên trái để tạo phiên truy cập Client Portal hoặc quản lý tài liệu chia sẻ cho khách hàng.
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

                  {shareable ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="client@company.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Client name (optional)" value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={200} />
                      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="expiresInHours 1–720" value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)} />
                      <button onClick={() => void createSession()} disabled={isWorking || !clientEmail.trim()} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                        Create session
                      </button>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Proposal ở trạng thái {selected.status} nên backend từ chối tạo phiên và material
                      (chỉ chấp nhận APPROVED, SENT_TO_CLIENT, ACCEPTED). Chuyển hồ sơ sang APPROVED trước khi chia sẻ.
                    </p>
                  )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">Sessions ({sessions.length})</span>
                      <span className="text-xs text-slate-400 font-normal">· Nhấp vào phiên để xem chi tiết &amp; phản hồi</span>
                    </div>
                    {selectedSessionId && (
                      <button
                        onClick={() => setSelectedSessionId(null)}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Bỏ chọn</span>
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
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
                          sessions.map((session) => {
                            const isSelected = selectedSessionId === session.id;
                            return (
                              <tr
                                key={session.id}
                                onClick={() => void handleSelectSession(session)}
                                className={`border-t border-slate-100 cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-emerald-50/80 border-l-4 border-l-brand-600 font-medium'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${session.revokedAt ? 'bg-rose-400' : 'bg-emerald-500'}`} />
                                    <div>
                                      <div className="font-bold text-slate-800">{session.clientName || session.clientEmail}</div>
                                      <div className="font-mono text-[10px] text-slate-400">{session.clientEmail}</div>
                                      {session.revokedAt && (
                                        <div className="text-[10px] font-bold text-rose-600">REVOKED {formatDateTime(session.revokedAt)}</div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{formatDateTime(session.expiresAt)}</td>
                                <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                                  {session.lastAccessedAt ? formatDateTime(session.lastAccessedAt) : <span className="text-slate-400">Chưa truy cập</span>}
                                </td>
                                <td className="px-3 py-2.5 font-mono text-xs">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                      session.commentCount > 0
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    <span>{session.commentCount}</span>
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {canManage && !session.revokedAt && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void revoke(session.id);
                                        }}
                                        disabled={isWorking}
                                        className="text-xs font-bold text-rose-600 hover:text-rose-800 disabled:opacity-50"
                                      >
                                        Revoke
                                      </button>
                                    )}
                                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-brand-600' : 'text-slate-400'}`} />
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Informational hint when no session is selected */}
                  {!selectedSessionId && sessions.length > 0 && (
                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/60 text-xs text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>💡</span>
                        <span>Nhấp vào bất kỳ phiên nào trong danh sách trên để xem chi tiết phiên và ý kiến phản hồi (Feedback) của khách hàng.</span>
                      </span>
                      {proposalComments.length > 0 && (
                        <span className="font-mono font-semibold text-emerald-700 shrink-0">
                          Tổng cộng {proposalComments.length} phản hồi
                        </span>
                      )}
                    </div>
                  )}

                  {/* Selected Session Details & Client Feedback */}
                  {selectedSession && (
                    <div className="border-t-2 border-brand-500 bg-gradient-to-b from-emerald-50/40 via-white to-white p-5 space-y-4">
                      {/* Session Details Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900 text-base">
                                {selectedSession.clientName || 'Khách hàng'}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                                selectedSession.revokedAt
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : new Date(selectedSession.expiresAt) < new Date()
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}>
                                {selectedSession.revokedAt ? 'ĐÃ THU HỒI' : new Date(selectedSession.expiresAt) < new Date() ? 'HẾT HẠN' : 'ĐANG HIỆU LỰC'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span>{selectedSession.clientEmail}</span>
                              <span className="text-slate-300">·</span>
                              <span>Session ID: {selectedSession.id}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canManage && !selectedSession.revokedAt && (
                            <button
                              onClick={() => void revoke(selectedSession.id)}
                              disabled={isWorking}
                              className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Thu hồi quyền truy cập
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedSessionId(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="Đóng chi tiết"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Information Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Thời Gian Cấp</span>
                          <span className="font-semibold text-slate-800 block mt-1">{formatDateTime(selectedSession.createdAt)}</span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Hạn Truy Cập</span>
                          <span className="font-semibold text-slate-800 block mt-1">{formatDateTime(selectedSession.expiresAt)}</span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Lần Xem Cuối</span>
                          <span className="font-semibold text-brand-700 block mt-1">
                            {selectedSession.lastAccessedAt ? formatDateTime(selectedSession.lastAccessedAt) : 'Chưa mở link'}
                          </span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Tổng Phản Hồi</span>
                          <span className="font-semibold text-emerald-700 block mt-1">
                            {selectedSessionComments.length} ý kiến góp ý
                          </span>
                        </div>
                      </div>

                      {/* Feedback / Comments List */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-brand-600" />
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                              Ý Kiến &amp; Phản Hồi Từ Khách Hàng ({selectedSessionComments.length})
                            </h4>
                          </div>
                          <span className="text-[11px] text-slate-400 font-normal">
                            Ghi nhận từ liên kết Client Portal (Không cần đăng nhập)
                          </span>
                        </div>

                        {isLoadingComments ? (
                          <div className="p-6 text-center text-xs text-slate-400 font-mono">
                            Đang tải phản hồi từ khách hàng...
                          </div>
                        ) : selectedSessionComments.length === 0 ? (
                          <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-white text-center space-y-1.5">
                            <MessageSquare className="w-6 h-6 text-slate-300 mx-auto" />
                            <p className="text-xs font-semibold text-slate-700">Chưa có phản hồi nào từ khách hàng trong phiên này</p>
                            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                              Khi khách hàng truy cập đường link Client Portal và gửi thắc mắc hoặc góp ý, nội dung sẽ lập tức xuất hiện tại đây để đội ngũ Presale &amp; Sales kịp thời xử lý.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {selectedSessionComments.map((comment) => (
                              <div
                                key={comment.id}
                                className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2 transition-all hover:border-emerald-300"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
                                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                                      {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'K'}
                                    </div>
                                    <span>{comment.authorName || selectedSession.clientName || 'Khách hàng'}</span>
                                    {comment.authorEmail && (
                                      <span className="text-slate-400 font-normal font-mono text-[11px]">
                                        ({comment.authorEmail})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDateTime(comment.createdAt)}</span>
                                  </div>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pl-1 font-sans">
                                  {comment.body}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
