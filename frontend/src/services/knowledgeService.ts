import { apiRequest, apiRequestWithMeta } from './apiClient';
import type { ListMeta } from '../types/auth';
import type {
  GenerateProposalOverviewResult,
  IngestDocumentResult,
  KnowledgeAskResult,
  KnowledgeDocument,
  RagChunk
} from '../types/knowledge';

const KNOWLEDGE = '/api/v1/knowledge';
const RAG = '/api/v1/rag';
const INGEST_TIMEOUT_MS = 120_000;
const AI_TIMEOUT_MS = 90_000;

export interface KnowledgeListQuery {
  page?: number;
  limit?: number;
  category?: string;
  domain?: string;
  search?: string;
}

export interface IngestDocumentInput {
  title: string;
  content: string;
  category?: string;
  domain?: string;
}

function toQueryString(query: KnowledgeListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.category) params.set('category', query.category);
  if (query.domain) params.set('domain', query.domain);
  if (query.search) params.set('search', query.search);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

function ingestBody(input: IngestDocumentInput): Record<string, string> {
  const body: Record<string, string> = { title: input.title, content: input.content };
  if (input.category) body.category = input.category;
  if (input.domain) body.domain = input.domain;
  return body;
}

export const knowledgeService = {
  list: async (query: KnowledgeListQuery = {}): Promise<{ documents: KnowledgeDocument[]; meta: ListMeta | null }> => {
    const result = await apiRequestWithMeta<KnowledgeDocument[]>(`${KNOWLEDGE}/documents${toQueryString(query)}`);
    return { documents: result.data ?? [], meta: result.meta };
  },

  getById: (id: string) => apiRequest<KnowledgeDocument>(`${KNOWLEDGE}/documents/${encodeURIComponent(id)}`),

  ingest: (input: IngestDocumentInput) =>
    apiRequest<IngestDocumentResult>(`${KNOWLEDGE}/documents`, {
      method: 'POST',
      body: ingestBody(input),
      timeoutMs: INGEST_TIMEOUT_MS
    }),

  delete: (id: string) =>
    apiRequest<void>(`${KNOWLEDGE}/documents/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  ask: (question: string, extras: { domain?: string; topK?: number } = {}) =>
    apiRequest<KnowledgeAskResult>(`${KNOWLEDGE}/ask`, {
      method: 'POST',
      body: {
        question,
        ...(extras.domain ? { domain: extras.domain } : {}),
        ...(extras.topK !== undefined ? { topK: extras.topK } : {})
      },
      timeoutMs: AI_TIMEOUT_MS
    }),

  search: async (
    query: string,
    extras: { domain?: string; topK?: number } = {}
  ): Promise<{ chunks: RagChunk[]; total: number }> => {
    const result = await apiRequestWithMeta<RagChunk[]>(`${RAG}/search`, {
      method: 'POST',
      body: {
        query,
        ...(extras.domain ? { domain: extras.domain } : {}),
        ...(extras.topK !== undefined ? { topK: extras.topK } : {})
      },
      timeoutMs: INGEST_TIMEOUT_MS
    });
    return { chunks: result.data ?? [], total: result.meta?.total ?? (result.data ?? []).length };
  },

  ingestViaRag: (input: IngestDocumentInput) =>
    apiRequest<IngestDocumentResult>(`${RAG}/ingest`, {
      method: 'POST',
      body: ingestBody(input),
      timeoutMs: INGEST_TIMEOUT_MS
    }),

  generateProposalOverview: (rfpText: string, extras: { domain?: string; maxTokens?: number } = {}) =>
    apiRequest<GenerateProposalOverviewResult>(`${RAG}/generate-proposal`, {
      method: 'POST',
      body: {
        rfpText,
        ...(extras.domain ? { domain: extras.domain } : {}),
        ...(extras.maxTokens !== undefined ? { maxTokens: extras.maxTokens } : {})
      },
      timeoutMs: AI_TIMEOUT_MS
    })
};
