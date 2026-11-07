import { DocumentChunk } from '../../domain/entities/DocumentChunk.js';

export interface RAGSearchInputDTO {
  query: unknown;
  domain?: unknown;
  topK?: number;
  organizationId?: string;
}

export interface RAGSearchOutputDTO {
  chunks: DocumentChunk[];
  totalRetrieved: number;
}

