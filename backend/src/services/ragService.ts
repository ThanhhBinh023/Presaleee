import { container } from '../container.js';
import { DocumentChunk } from '../domain/entities/DocumentChunk.js';
import { TextSplitterService } from '../application/services/TextSplitterService.js';

export interface RetrievedChunk extends DocumentChunk {}

/**
 * RAGService facade providing backward compatibility for earlier service layers.
 * Delegates to Clean Architecture use cases in application layer.
 */
export class RAGService {
  /**
   * Splits a long text into sliding windows of words with configurable overlap.
   */
  static splitIntoChunks(text: string, chunkSize: number = 400, overlap: number = 50): string[] {
    return TextSplitterService.splitIntoChunks(text, chunkSize, overlap);
  }

  /**
   * Ingests a new document and its vector embeddings into the database.
   */
  static async ingestDocument(
    title: string,
    category: string,
    domain: string,
    content: string,
    organizationId: string,
    uploadedBy: string
  ): Promise<{ docId: string; totalChunks: number }> {
    return container.ingestDocumentUseCase.execute({
      title,
      category,
      domain,
      content,
      organizationId,
      uploadedBy
    });
  }

  /**
   * Searches for semantically relevant chunks using Hybrid RAG (Dense Vector + Full-Text Search with RRF).
   */
  static async searchRelevantContext(
    queryText: string,
    organizationId: string,
    domain?: string,
    topK: number = 3
  ): Promise<RetrievedChunk[]> {
    const result = await container.searchHybridRAGUseCase.execute({
      query: queryText,
      organizationId,
      domain,
      topK
    });
    return result.chunks;
  }

  /**
   * Generates a context-aware proposal overview using Hybrid RAG and fine-tuned LLM.
   */
  static async generateContextAwareProposalOverview(
    rfpText: string,
    organizationId: string,
    domain?: string
  ): Promise<{ overview: string; sources: RetrievedChunk[] }> {
    return container.generateProposalUseCase.execute({
      rfpText,
      organizationId,
      domain
    });
  }
}
