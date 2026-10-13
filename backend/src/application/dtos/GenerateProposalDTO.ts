import { DocumentChunk } from '../../domain/entities/DocumentChunk.js';

export interface GenerateProposalInputDTO {
  rfpText: string;
  domain?: string;
  maxTokens?: number;
}

export interface GenerateProposalOutputDTO {
  overview: string;
  sources: DocumentChunk[];
}

