import { DocumentChunk } from '../../domain/entities/DocumentChunk.js';

export interface RAGSearchInputDTO {
  query: string;
  domain?: string;
  topK?: number;
}

export interface RAGSearchOutputDTO {
  chunks: DocumentChunk[];
  totalRetrieved: number;
}
