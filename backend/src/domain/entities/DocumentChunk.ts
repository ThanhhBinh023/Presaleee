export interface DocumentChunkMetadata {
  title?: string;
  category?: string;
  domain?: string;
  section?: string;
  tech_stack?: string[];
  compliance?: string[];
  [key: string]: any;
}

export interface DocumentChunk {
  id: string;
  docId: string;
  chunkIndex: number;
  chunkContent: string;
  metadata: DocumentChunkMetadata;
  embedding?: number[];
  combinedScore?: number;
  semanticRank?: number | null;
  ftsRank?: number | null;
}
