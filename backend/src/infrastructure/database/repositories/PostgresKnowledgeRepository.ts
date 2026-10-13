import { Pool } from 'pg';
import { IKnowledgeRepository, HybridSearchParams } from '../../../domain/repositories/IKnowledgeRepository.js';
import { KnowledgeDocument } from '../../../domain/entities/KnowledgeDocument.js';
import { DocumentChunk } from '../../../domain/entities/DocumentChunk.js';

export class PostgresKnowledgeRepository implements IKnowledgeRepository {
  constructor(private readonly pool: Pool) {}

  async createDocument(doc: Omit<KnowledgeDocument, 'id'>): Promise<string> {
    const res = await this.pool.query(
      `INSERT INTO knowledge_docs (title, category, domain, organization_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id;`,
      [doc.title, doc.category, doc.domain, doc.organizationId || null]
    );
    return res.rows[0].id;
  }

  async saveDocumentChunks(
    docId: string,
    chunks: Array<{ chunkIndex: number; chunkContent: string; metadata: Record<string, any>; embedding: number[] }>
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const chunk of chunks) {
        const vectorStr = `[${chunk.embedding.join(',')}]`;
        await client.query(
          `INSERT INTO document_chunks (doc_id, chunk_index, chunk_content, metadata, embedding)
           VALUES ($1, $2, $3, $4, $5::vector);`,
          [docId, chunk.chunkIndex, chunk.chunkContent, chunk.metadata, vectorStr]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async searchHybrid(params: HybridSearchParams): Promise<DocumentChunk[]> {
    const vectorStr = `[${params.queryEmbedding.join(',')}]`;
    const matchCount = params.matchCount || 3;
    const fullTextWeight = params.fullTextWeight ?? 1.0;
    const semanticWeight = params.semanticWeight ?? 1.0;
    const rrfK = params.rrfK ?? 60;
    const domain = params.domain || null;

    const res = await this.pool.query(
      `SELECT id, doc_id, chunk_content, metadata, combined_score, semantic_rank, fts_rank
       FROM hybrid_search_chunks(
         query_text => $1,
         query_embedding => $2::vector,
         match_count => $3,
         full_text_weight => $4,
         semantic_weight => $5,
         rrf_k => $6,
         filter_domain => $7
       );`,
      [params.queryText, vectorStr, matchCount, fullTextWeight, semanticWeight, rrfK, domain]
    );

    return res.rows.map((r: any) => ({
      id: r.id,
      docId: r.doc_id,
      chunkIndex: r.chunk_index ?? 0,
      chunkContent: r.chunk_content,
      metadata: r.metadata || {},
      combinedScore: parseFloat(r.combined_score),
      semanticRank: r.semantic_rank ? parseInt(r.semantic_rank, 10) : null,
      ftsRank: r.fts_rank ? parseInt(r.fts_rank, 10) : null
    }));
  }
}

