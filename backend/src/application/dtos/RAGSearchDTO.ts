import { DocumentChunk } from '../../domain/entities/DocumentChunk.js';

export interface RAGSearchInputDTO {
  query: string;
  domain?: string;
  topK?: number;
  organizationId?: string;
}

export interface RAGSearchOutputDTO {
  chunks: DocumentChunk[];
  totalRetrieved: number;
}

