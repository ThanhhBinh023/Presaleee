import { Pool } from 'pg';
import { IKnowledgeRepository, HybridSearchParams, KnowledgeDocumentFilter } from '../../../domain/repositories/IKnowledgeRepository.js';
import { KnowledgeDocument } from '../../../domain/entities/KnowledgeDocument.js';
import { DocumentChunk } from '../../../domain/entities/DocumentChunk.js';

export class PostgresKnowledgeRepository implements IKnowledgeRepository {
  constructor(private readonly pool: Pool) {}

  async createDocument(doc: Omit<KnowledgeDocument, 'id'>): Promise<string> {
    const res = await this.pool.query(
      `INSERT INTO knowledge_docs (title, category, domain, organization_id, uploaded_by, file_type, total_tokens)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id;`,
      [doc.title, doc.category, doc.domain, doc.organizationId || null, doc.uploadedBy || null, doc.fileType || 'TEXT', doc.totalTokens || 0]
    );
    return res.rows[0].id;
  }

  async findDocuments(filter: KnowledgeDocumentFilter): Promise<{ documents: KnowledgeDocument[]; total: number }> {
    const conditions = ['organization_id = $1'];
    const values: unknown[] = [filter.organizationId];
    if (filter.category) { values.push(filter.category); conditions.push(`category = $${values.length}`); }
    if (filter.domain) { values.push(filter.domain); conditions.push(`domain = $${values.length}`); }
    if (filter.search) { values.push(`%${filter.search}%`); conditions.push(`title ILIKE $${values.length}`); }
    const where = conditions.join(' AND ');
    const count = await this.pool.query(`SELECT COUNT(*)::int AS total FROM knowledge_docs WHERE ${where};`, values);
    const total = Number(count.rows[0]?.total || 0);
    const pageValues = [...values, filter.limit, filter.offset];
    const result = await this.pool.query(
      `SELECT kd.id, kd.organization_id, kd.uploaded_by, kd.title, kd.category, kd.domain,
              kd.file_url, kd.file_type, kd.total_tokens, kd.created_at, kd.updated_at,
              COUNT(dc.id)::int AS total_chunks
       FROM knowledge_docs kd LEFT JOIN document_chunks dc ON dc.doc_id = kd.id
       WHERE ${where}
       GROUP BY kd.id ORDER BY kd.updated_at DESC, kd.created_at DESC
       LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length};`,
      pageValues
    );
    return { documents: result.rows.map(row => this.mapDocument(row)), total };
  }

  async findDocumentById(id: string, organizationId: string): Promise<KnowledgeDocument | null> {
    const result = await this.pool.query(
      `SELECT kd.id, kd.organization_id, kd.uploaded_by, kd.title, kd.category, kd.domain,
              kd.file_url, kd.file_type, kd.total_tokens, kd.created_at, kd.updated_at,
              COUNT(dc.id)::int AS total_chunks
       FROM knowledge_docs kd LEFT JOIN document_chunks dc ON dc.doc_id = kd.id
       WHERE kd.id = $1 AND kd.organization_id = $2 GROUP BY kd.id;`,
      [id, organizationId]
    );
    return result.rows[0] ? this.mapDocument(result.rows[0]) : null;
  }

  async deleteDocument(id: string, organizationId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM knowledge_docs WHERE id = $1 AND organization_id = $2 RETURNING id;',
      [id, organizationId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapDocument(row: any): KnowledgeDocument {
    return {
      id: row.id,
      organizationId: row.organization_id,
      uploadedBy: row.uploaded_by,
      title: row.title,
      category: row.category,
      domain: row.domain,
      fileUrl: row.file_url,
      fileType: row.file_type,
      totalTokens: Number(row.total_tokens || 0),
      totalChunks: Number(row.total_chunks || 0),
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    };
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
    const organizationId = params.organizationId || null;

    const res = await this.pool.query(
      `SELECT id, doc_id, chunk_content, metadata, combined_score, semantic_rank, fts_rank
       FROM hybrid_search_chunks(
         query_text => $1,
         query_embedding => $2::vector,
         match_count => $3,
         full_text_weight => $4,
         semantic_weight => $5,
         rrf_k => $6,
         filter_organization_id => $7,
         filter_domain => $8
       );`,
      [params.queryText, vectorStr, matchCount, fullTextWeight, semanticWeight, rrfK, organizationId, domain]
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

