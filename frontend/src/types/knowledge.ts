export interface KnowledgeDocument {
  id: string;
  organizationId: string | null;
  uploadedBy: string | null;
  title: string;
  category: string;
  domain: string;
  fileUrl: string | null;
  fileType: string | null;
  totalTokens: number;
  totalChunks: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface IngestDocumentResult {
  docId: string;
  totalChunks: number;
}

export interface KnowledgeCitation {
  id: string;
  documentId: string;
  label: string;
  title: string;
  excerpt: string;
  score: number | null;
}

export interface KnowledgeAskResult {
  answer: string;
  citations: KnowledgeCitation[];
}

export interface RagChunk {
  id: string;
  docId: string;
  chunkIndex: number;
  chunkContent: string;
  metadata: {
    title?: string;
    category?: string;
    domain?: string;
    section?: string;
    tech_stack?: string[];
    compliance?: string[];
    [key: string]: unknown;
  };
  combinedScore?: number;
  semanticRank?: number | null;
  ftsRank?: number | null;
}

export interface GenerateProposalOverviewResult {
  overview: string;
  sources: RagChunk[];
}

export const KNOWLEDGE_CATEGORIES = [
  'GENERAL',
  'PROPOSAL_TEMPLATE',
  'TECH_SPEC',
  'CASE_STUDY',
  'RATE_CARD',
  'POLICY'
] as const;
