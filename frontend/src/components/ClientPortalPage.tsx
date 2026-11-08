import React, { useEffect, useState } from 'react';
import { portalClientService } from '../services/portalService';
import { ApiError } from '../services/apiClient';
import { navigateTo, readHashQuery } from '../navigation';
import { formatDateTime, formatMoney } from '../utils/format';
import type { PortalComment, PortalMaterial, PortalProposalView, PortalQuestionAnswer } from '../types/portal';

const STORAGE_KEY = 'presaleee.clientPortal';

interface StoredPortal {
  proposalId: string;
  token: string;
}

function readStored(): StoredPortal | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPortal;
    if (!parsed.proposalId || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const ClientPortalPage: React.FC = () => {
  const [proposalId, setProposalId] = useState('');
  const [token, setToken] = useState('');
  const [active, setActive] = useState<StoredPortal | null>(null);

  const [proposal, setProposal] = useState<PortalProposalView | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [comments, setComments] = useState<PortalComment[]>([]);
  const [materials, setMaterials] = useState<PortalMaterial[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<PortalQuestionAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const persistAndStrip = (next: StoredPortal) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setActive(next);
    navigateTo('client-portal', { proposalId: next.proposalId });
  };

  useEffect(() => {
    const query = readHashQuery();
    const fromQueryId = query.get('proposalId') ?? '';
    const fromQueryToken = query.get('token') ?? '';
    if (fromQueryId && fromQueryToken) {
      persistAndStrip({ proposalId: fromQueryId, token: fromQueryToken });
      return;
    }
    const stored = readStored();
    if (fromQueryId && stored && stored.proposalId === fromQueryId) {
      setActive(stored);
      setProposalId(stored.proposalId);
      return;
    }
    if (stored) {
      setActive(stored);
      setProposalId(stored.proposalId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async (session: StoredPortal) => {
    setIsWorking(true);
    setError(null);
    try {
      const [view, commentRows, materialRows] = await Promise.all([
        portalClientService.getProposal(session.proposalId, session.token),
        portalClientService.listComments(session.proposalId, session.token),
        portalClientService.listMaterials(session.proposalId, session.token)
      ]);
      setProposal(view);
      setComments(commentRows);
      setMaterials(materialRows);
      setSheetName(view.sheets[0]?.sheetName ?? '');
    } catch (err) {
      setProposal(null);
      setComments([]);
      setMaterials([]);
      const message = err instanceof ApiError && err.status === 401
        ? 'Portal session is invalid, expired, or revoked.'
        : err instanceof Error ? err.message : 'Failed to load the shared proposal.';
      setError(message);
    } finally {
      setIsWorking(false);
    }
  };

  useEffect(() => {
    if (active) void loadAll(active);
  }, [active]);

  const connect = () => {
    const next = { proposalId: proposalId.trim(), token: token.trim() };
    if (!next.proposalId || !next.token) {
      setError('Proposal id and access token are required.');
      return;
    }
    persistAndStrip(next);
  };

  const signOut = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setActive(null);
    setProposal(null);
    setToken('');
    navigateTo('client-portal');
  };

  const postComment = async () => {
    if (!active) return;
    setIsWorking(true);
    setError(null);
    try {
      await portalClientService.createComment(active.proposalId, active.token, commentBody.trim());
      setCommentBody('');
      setNotice('Comment posted. Author name and email come from the portal session.');
      setComments(await portalClientService.listComments(active.proposalId, active.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comment failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const ask = async () => {
    if (!active) return;
    setIsWorking(true);
    setError(null);
    setAnswer(null);
    try {
      const result = await portalClientService.ask(active.proposalId, active.token, question.trim());
      setAnswer(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Question failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const exportPdf = async () => {
    if (!active) return;
    setIsWorking(true);
    setError(null);
    try {
      await portalClientService.exportPdf(active.proposalId, active.token);
      setNotice('PDF download started.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF export failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const currentSheet = proposal?.sheets.find((sheet) => sheet.sheetName === sheetName);

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 font-sans text-slate-900 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              onClick={() => navigateTo('home')}
              className="mb-1 text-xs font-mono font-bold text-brand-700 hover:underline block"
            >
              &larr; BACK TO APP
            </button>
            <p className="text-xs font-mono font-bold text-brand-700">CLIENT PORTAL</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Shared proposal</h1>
            <p className="mt-1 text-sm text-slate-500">
              Uses a Bearer token only. Staff cookies are not sent. All 10 sheets are returned by the API, including internal working sheets.
            </p>
          </div>
          {active && (
            <button onClick={signOut} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              Leave portal
            </button>
          )}
        </div>

        {notice && <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
        {error && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {!active && (
          <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Proposal UUID" value={proposalId} onChange={(e) => setProposalId(e.target.value)} />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Access token" value={token} onChange={(e) => setToken(e.target.value)} />
            <button onClick={connect} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white sm:col-span-2">
              Open shared proposal
            </button>
          </div>
        )}

        {active && !proposal && isWorking && <p className="text-sm text-slate-500">Loading shared proposal…</p>}

        {proposal && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">{proposal.title}</h2>
                  <p className="text-sm text-slate-500">
                    {proposal.version} · {proposal.status} · {formatMoney(proposal.totalCost ?? null, proposal.currency)} · {proposal.estimatedTimelineWeeks ?? '—'} weeks
                  </p>
                </div>
                <button onClick={() => void exportPdf()} disabled={isWorking} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  Download PDF
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {proposal.sheets.map((sheet) => (
                  <button
                    key={sheet.sheetName}
                    onClick={() => setSheetName(sheet.sheetName)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      sheetName === sheet.sheetName ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {sheet.sheetOrder}. {sheet.sheetName}
                  </button>
                ))}
              </div>
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">
                {JSON.stringify(currentSheet?.sheetData ?? {}, null, 2)}
              </pre>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold">Ask a question</h3>
              <textarea className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" maxLength={5000} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question (max 5000). Needs the AI service on :8000." />
              <button onClick={() => void ask()} disabled={isWorking || !question.trim()} className="mt-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                Ask
              </button>
              {answer && (
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  <p className="whitespace-pre-wrap text-slate-800">{answer.answer}</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-500">
                    {answer.citations.map((citation, index) => (
                      <li key={`${citation.sheetName}-${index}`}>
                        {citation.label} {citation.sheetName} — {citation.excerpt.slice(0, 160)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold">Shared materials ({materials.length})</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {materials.length === 0 ? (
                  <li className="text-slate-400">No shared files.</li>
                ) : (
                  materials.map((material) => (
                    <li key={material.id}>
                      <a href={material.fileUrl} className="font-bold text-brand-700 underline" target="_blank" rel="noreferrer">{material.title}</a>
                      <span className="ml-2 font-mono text-[10px] text-slate-400">{material.fileName}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold">Comments ({comments.length})</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {comments.map((comment) => (
                  <li key={comment.id} className="rounded-lg border border-slate-100 px-3 py-2">
                    <div className="text-xs text-slate-500">{comment.authorName} · {comment.authorEmail} · {formatDateTime(comment.createdAt)}</div>
                    <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
                  </li>
                ))}
              </ul>
              <textarea className="mt-3 min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" maxLength={5000} value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Comment (max 5000)" />
              <button onClick={() => void postComment()} disabled={isWorking || !commentBody.trim()} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                Post comment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
