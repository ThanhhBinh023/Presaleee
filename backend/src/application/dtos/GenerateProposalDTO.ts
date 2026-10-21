import { DocumentChunk } from '../../domain/entities/DocumentChunk.js';

export interface GenerateProposalInputDTO {
  rfpText: unknown;
  organizationId: string;
  domain?: unknown;
  maxTokens?: number;
}

export interface GenerateProposalOutputDTO {
  overview: string;
  sources: DocumentChunk[];
}

