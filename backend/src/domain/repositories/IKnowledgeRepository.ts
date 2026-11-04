import { DocumentChunk } from '../entities/DocumentChunk.js';
import { KnowledgeDocument } from '../entities/KnowledgeDocument.js';

export interface HybridSearchParams {
  queryText: string;
  queryEmbedding: number[];
  matchCount?: number;
  fullTextWeight?: number;
  semanticWeight?: number;
  rrfK?: number;
  domain?: string | null;
  organizationId?: string | null;
}

export interface KnowledgeDocumentFilter {
  organizationId: string;
  category?: string;
  domain?: string;
  search?: string;
  limit: number;
  offset: number;
}

export interface IKnowledgeRepository {
  createDocument(doc: Omit<KnowledgeDocument, 'id'>): Promise<string>;
  findDocuments(filter: KnowledgeDocumentFilter): Promise<{ documents: KnowledgeDocument[]; total: number }>;
  findDocumentById(id: string, organizationId: string): Promise<KnowledgeDocument | null>;
  deleteDocument(id: string, organizationId: string): Promise<boolean>;
  saveDocumentChunks(
    docId: string,
    chunks: Array<{ chunkIndex: number; chunkContent: string; metadata: Record<string, any>; embedding: number[] }>
  ): Promise<void>;
  searchHybrid(params: HybridSearchParams): Promise<DocumentChunk[]>;
}

