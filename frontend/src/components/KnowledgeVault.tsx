import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useKnowledgeDirectory } from '../hooks/useKnowledgeDirectory';
import { knowledgeService } from '../services/knowledgeService';
import { navigateTo, readHashQuery } from '../navigation';
import { formatDateTime } from '../utils/format';
import { KNOWLEDGE_CATEGORIES } from '../types/knowledge';
import type {
  GenerateProposalOverviewResult,
  KnowledgeAskResult,
  KnowledgeDocument,
  RagChunk
} from '../types/knowledge';

const PAGE_SIZE = 20;

interface KnowledgeVaultProps {
  onNavigateOverview: () => void;
  onNavigateAIWorkspace: () => void;
  onLogout: () => void;
}

type RagTab = 'search' | 'ask' | 'generate';

export const KnowledgeVault: React.FC<KnowledgeVaultProps> = ({
  onNavigateOverview,
  onNavigateAIWorkspace
}) => {
  const { user } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [page, setPage] = useState(1);

  const { documents, meta, isLoading, error, reload } = useKnowledgeDirectory({
    page,
    limit: PAGE_SIZE,
    category: category || undefined,
    domain: domainFilter || undefined,
    search: search || undefined
  });

  const [detail, setDetail] = useState<KnowledgeDocument | null>(null);
  const [title, setTitle] = useState('');
  const [ingestCategory, setIngestCategory] = useState('');
  const [ingestDomain, setIngestDomain] = useState('');
  const [content, setContent] = useState('');
  const [useRagAlias, setUseRagAlias] = useState(false);

  const [tab, setTab] = useState<RagTab>('search');
  const [queryText, setQueryText] = useState('');
  const [ragDomain, setRagDomain] = useState('');
  const [topK, setTopK] = useState('5');
  const [maxTokens, setMaxTokens] = useState('1500');
  const [chunks, setChunks] = useState<RagChunk[]>([]);
  const [askResult, setAskResult] = useState<KnowledgeAskResult | null>(null);
  const [overview, setOverview] = useState<GenerateProposalOverviewResult | null>(null);

  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, category, domainFilter]);

  const openDocument = async (id: string, announce?: string) => {
    setIsWorking(true);
    setActionError(null);
    setConfirmDelete(false);
    if (announce) setNotice(announce);
    try {
      const document = await knowledgeService.getById(id);
      setDetail(document);
      navigateTo('vault', { id: document.id });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to load the document.');
    } finally {
      setIsWorking(false);
    }
  };

  useEffect(() => {
    const id = readHashQuery().get('id');
    if (id) void openDocument(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ingest = async () => {
    setIsWorking(true);
    setActionError(null);
    try {
      const payload = {
        title: title.trim(),
        content,
        category: ingestCategory.trim() || undefined,
        domain: ingestDomain.trim() || undefined
      };
      const result = useRagAlias
        ? await knowledgeService.ingestViaRag(payload)
        : await knowledgeService.ingest(payload);
      setNotice(`Indexed ${result.totalChunks} chunk(s). Raw text is not stored on the document row.`);
      setTitle('');
      setContent('');
      reload();
      await openDocument(result.docId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ingest failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const remove = async () => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      await knowledgeService.delete(detail.id);
      setNotice('Document deleted. Chunks and embeddings cascaded.');
      setDetail(null);
      setConfirmDelete(false);
      navigateTo('vault');
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const runSearch = async () => {
    setIsWorking(true);
    setActionError(null);
    setAskResult(null);
    setOverview(null);
    try {
      const result = await knowledgeService.search(queryText.trim(), {
        domain: ragDomain.trim() || undefined,
        topK: Number(topK)
      });
      setChunks(result.chunks);
      setNotice(`Hybrid search returned ${result.total} chunk(s). chunkIndex is always 0 from the RPC.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const runAsk = async () => {
    setIsWorking(true);
    setActionError(null);
    setChunks([]);
    setOverview(null);
    try {
      const result = await knowledgeService.ask(queryText.trim(), {
        domain: ragDomain.trim() || undefined,
        topK: Number(topK)
      });
      setAskResult(result);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ask failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const runGenerate = async () => {
    setIsWorking(true);
    setActionError(null);
    setChunks([]);
    setAskResult(null);
    try {
      const result = await knowledgeService.generateProposalOverview(queryText.trim(), {
        domain: ragDomain.trim() || undefined,
        maxTokens: Number(maxTokens)
      });
      setOverview(result);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Generate failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 font-sans text-slate-900 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={onNavigateOverview} className="text-xs font-mono font-bold text-brand-700 hover:underline">
              &larr; OVERVIEW
            </button>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Knowledge vault</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ingest plain text, list metadata, hybrid RAG search, ask with citations, generate a proposal overview. VIEWER can write (no role guard).
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onNavigateAIWorkspace} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              AI workspace
            </button>
            <button onClick={() => navigateTo('proposals')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              Proposals
            </button>
          </div>
        </div>

        {!user?.organizationId && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Your account needs an organization before knowledge APIs will accept requests.
          </p>
        )}
        {user?.role === 'VIEWER' && (
          <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            VIEWER can ingest, delete, search and ask. Vault routes only check authentication plus organization.
          </p>
        )}

        {notice && <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
        {actionError && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p>}
        {error && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="mb-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Title (required, max 255)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={ingestCategory} onChange={(e) => setIngestCategory(e.target.value)}>
            <option value="">Category omitted → GENERAL</option>
            {KNOWLEDGE_CATEGORIES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Domain omitted → GENERAL (empty string is 400)" value={ingestDomain} onChange={(e) => setIngestDomain(e.target.value)} maxLength={100} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={useRagAlias} onChange={(e) => setUseRagAlias(e.target.checked)} />
            Use POST /rag/ingest alias
          </label>
          <textarea
            className="min-h-[90px] rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            placeholder="Plain text content (required). File upload is not implemented. Identical text creates a second document."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button onClick={() => void ingest()} disabled={isWorking || !title.trim() || !content.trim()} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">
            Ingest and embed
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search title (metadata only)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">All categories</option>
            {KNOWLEDGE_CATEGORIES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <input value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} placeholder="Domain exact match" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" maxLength={100} />
          <button onClick={reload} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600">Reload</button>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-mono font-bold text-slate-500">
                <tr>
                  <th className="px-3 py-2">TITLE</th>
                  <th className="px-3 py-2">LABELS</th>
                  <th className="px-3 py-2">CHUNKS</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="px-3 py-6 text-slate-400" colSpan={3}>Loading…</td></tr>
                ) : documents.length === 0 ? (
                  <tr><td className="px-3 py-6 text-slate-400" colSpan={3}>No documents match these filters.</td></tr>
                ) : (
                  documents.map((document) => (
                    <tr
                      key={document.id}
                      className={`cursor-pointer border-t border-slate-100 hover:bg-emerald-50/40 ${detail?.id === document.id ? 'bg-emerald-50/70' : ''}`}
                      onClick={() => void openDocument(document.id)}
                    >
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-800">{document.title}</div>
                        <div className="font-mono text-[10px] text-slate-400">{document.fileType || 'TEXT'} · {formatDateTime(document.updatedAt)}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-500">
                        {document.category}<br />{document.domain}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{document.totalChunks}</td>
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

          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              {!detail ? (
                <p className="text-sm text-slate-500">Select a document. Detail has metadata and chunk count only — original content is not stored on knowledge_docs.</p>
              ) : (
                <>
                  <h2 className="text-lg font-bold">{detail.title}</h2>
                  <p className="font-mono text-[10px] text-slate-400">{detail.id}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-400">Category</span><div className="font-mono">{detail.category}</div></div>
                    <div><span className="text-slate-400">Domain</span><div className="font-mono">{detail.domain}</div></div>
                    <div><span className="text-slate-400">Chunks</span><div className="font-mono">{detail.totalChunks}</div></div>
                    <div><span className="text-slate-400">Tokens (words)</span><div className="font-mono">{detail.totalTokens}</div></div>
                    <div><span className="text-slate-400">Uploaded</span><div className="font-mono">{formatDateTime(detail.createdAt)}</div></div>
                    <div><span className="text-slate-400">File</span><div className="font-mono">{detail.fileType || '—'}</div></div>
                  </dl>
                  {confirmDelete ? (
                    <button onClick={() => void remove()} disabled={isWorking} className="mt-4 w-full rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">
                      Confirm delete (chunks cascade)
                    </button>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)} className="mt-4 w-full rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600">
                      Delete document
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex flex-wrap gap-1">
                {(['search', 'ask', 'generate'] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setTab(value)}
                    className={`rounded-full px-3 py-1 text-[10px] font-bold ${tab === value ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {value === 'search' ? 'Hybrid search' : value === 'ask' ? 'Ask vault' : 'Generate overview'}
                  </button>
                ))}
              </div>
              <textarea
                className="min-h-[100px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder={tab === 'generate' ? 'RFP text (max 20,000). Retrieval topK is fixed at 3.' : 'Query / question (max 20,000). Needs embeddings; ask/generate also need the AI service on :8000.'}
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
              />
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="domain (optional)" value={ragDomain} onChange={(e) => setRagDomain(e.target.value)} maxLength={100} />
                <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder={tab === 'ask' ? 'topK 1–10' : 'topK 1–20'} value={topK} onChange={(e) => setTopK(e.target.value)} disabled={tab === 'generate'} />
                <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="maxTokens 1–8000" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} disabled={tab !== 'generate'} />
              </div>
              <button
                onClick={() => void (tab === 'search' ? runSearch() : tab === 'ask' ? runAsk() : runGenerate())}
                disabled={isWorking || !queryText.trim()}
                className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {tab === 'search' ? 'Search chunks' : tab === 'ask' ? 'Ask' : 'Generate overview'}
              </button>

              {chunks.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm">
                  {chunks.map((chunk) => (
                    <li key={chunk.id} className="rounded-lg border border-slate-100 px-3 py-2">
                      <div className="text-[10px] font-mono text-slate-400">
                        {(typeof chunk.metadata.title === 'string' ? chunk.metadata.title : chunk.docId)} · score {chunk.combinedScore ?? '—'} · semantic {chunk.semanticRank ?? '—'} · fts {chunk.ftsRank ?? '—'} · window {chunk.chunkIndex}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-slate-700">{chunk.chunkContent.slice(0, 400)}</p>
                    </li>
                  ))}
                </ul>
              )}

              {askResult && (
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  <p className="whitespace-pre-wrap text-slate-800">{askResult.answer}</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-500">
                    {askResult.citations.map((citation) => (
                      <li key={citation.id}>
                        {citation.label} {citation.title} · score {citation.score ?? '—'} — {citation.excerpt.slice(0, 160)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {overview && (
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  <p className="whitespace-pre-wrap text-slate-800">{overview.overview}</p>
                  <div className="mt-2 text-[10px] font-mono font-bold uppercase text-slate-400">Sources ({overview.sources.length})</div>
                  <ul className="mt-1 space-y-1 text-xs text-slate-500">
                    {overview.sources.map((source) => (
                      <li key={source.id}>{(typeof source.metadata.title === 'string' ? source.metadata.title : source.docId)} — {source.chunkContent.slice(0, 120)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
