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

export interface IKnowledgeRepository {
  createDocument(doc: Omit<KnowledgeDocument, 'id'>): Promise<string>;
  saveDocumentChunks(
    docId: string,
    chunks: Array<{ chunkIndex: number; chunkContent: string; metadata: Record<string, any>; embedding: number[] }>
  ): Promise<void>;
  searchHybrid(params: HybridSearchParams): Promise<DocumentChunk[]>;
}

