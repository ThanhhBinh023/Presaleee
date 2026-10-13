import { dbPool } from '../database/index.js';
import { AIClient } from '../clients/aiClient.js';

export interface RetrievedChunk {
  id: string;
  doc_id: string;
  chunk_content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export class RAGService {
  /**
   * Bước 1: Chia nhỏ văn bản (Chunking) theo độ dài token/từ
   */
  static splitIntoChunks(text: string, chunkSize: number = 400, overlap: number = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    let i = 0;
    while (i < words.length) {
      const chunkWords = words.slice(i, i + chunkSize);
      chunks.push(chunkWords.join(' '));
      if (i + chunkSize >= words.length) break;
      i += chunkSize - overlap;
    }

    return chunks;
  }

  /**
   * Bước 2: Ingest tài liệu mới vào pgvector trên Supabase
   */
  static async ingestDocument(
    title: string,
    category: string,
    domain: string,
    content: string
  ): Promise<{ docId: string; totalChunks: number }> {
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      // 1. Tạo bản ghi knowledge_docs
      const docRes = await client.query(
        `INSERT INTO knowledge_docs (title, category, domain) 
         VALUES ($1, $2, $3) RETURNING id`,
        [title, category, domain]
      );
      const docId = docRes.rows[0].id;

      // 2. Chia chunks
      const textChunks = this.splitIntoChunks(content);

      if (textChunks.length > 0) {
        // 3. Gọi AI Service để lấy vectors 1024-dim
        const embeddings = await AIClient.getEmbeddings(textChunks);

        // 4. Lưu từng chunk và vector vào Supabase
        for (let idx = 0; idx < textChunks.length; idx++) {
          const vectorStr = `[${embeddings[idx].join(',')}]`;
          await client.query(
            `INSERT INTO document_chunks (doc_id, chunk_index, chunk_content, metadata, embedding)
             VALUES ($1, $2, $3, $4, $5::vector)`,
            [docId, idx, textChunks[idx], { domain, category, title }, vectorStr]
          );
        }
      }

      await client.query('COMMIT');
      return { docId, totalChunks: textChunks.length };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Ingest document failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Bước 3: Tìm kiếm ngữ cảnh liên quan qua HYBRID RAG (Vector 768 dims + Full-Text Search RRF)
   */
  static async searchRelevantContext(
    queryText: string,
    domain?: string,
    topK: number = 3
  ): Promise<RetrievedChunk[]> {
    // 1. Lấy embedding 768 dims của câu hỏi từ AI Service
    const [queryEmbedding] = await AIClient.getEmbeddings([queryText]);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    // 2. Truy vấn hàm hybrid_search_chunks trên Supabase
    const res = await dbPool.query(
      `SELECT id, doc_id, chunk_content, metadata, combined_score, semantic_rank, fts_rank 
       FROM hybrid_search_chunks(
         query_text => $1,
         query_embedding => $2::vector,
         match_count => $3,
         full_text_weight => 1.0,
         semantic_weight => 1.0,
         rrf_k => 60,
         filter_domain => $4
       )`,
      [queryText, vectorStr, topK, domain || null]
    );

    return res.rows;
  }

  /**
   * Bước 4: Sinh Proposal có ngữ cảnh (Hybrid RAG Generation)
   */
  static async generateContextAwareProposalOverview(
    rfpText: string,
    domain?: string
  ): Promise<{ overview: string; sources: RetrievedChunk[] }> {
    // 1. Retrieve: Tìm tài liệu / case study tương tự qua Hybrid Search
    const relevantChunks = await this.searchRelevantContext(rfpText, domain, 3);

    // 2. Augment: Ghép context chính xác từ các dự án quá khứ vào Prompt
    let augmentedPrompt = `YÊU CẦU DỰ ÁN MỚI TỪ KHÁCH HÀNG:\n${rfpText}\n\n`;

    if (relevantChunks.length > 0) {
      augmentedPrompt += `[THÔNG TIN THAM KHẢO & DỮ LIỆU ĐÃ ĐƯỢC CHỨNG MINH TỪ CÁC DỰ ÁN TƯƠNG ĐỒNG TRONG QUÁ KHỨ]:\n`;
      relevantChunks.forEach((chunk, index) => {
        const title = chunk.metadata?.title || 'Tài liệu tham khảo';
        const section = chunk.metadata?.section || '';
        const tech = chunk.metadata?.tech_stack ? chunk.metadata.tech_stack.join(', ') : '';
        const compliance = chunk.metadata?.compliance ? chunk.metadata.compliance.join(', ') : '';

        augmentedPrompt += `Tham khảo #${index + 1} (${title} - ${section}):\n`;
        augmentedPrompt += `- Nội dung: ${chunk.chunk_content}\n`;
        if (tech) augmentedPrompt += `- Tech stack đã áp dụng: ${tech}\n`;
        if (compliance) augmentedPrompt += `- Tiêu chuẩn bảo mật: ${compliance}\n`;
        augmentedPrompt += `\n`;
      });

      augmentedPrompt += `HƯỚNG DẪN TỔNG HỢP:\n`;
      augmentedPrompt += `Dựa trên yêu cầu mới của khách hàng và các giải pháp đã kiểm chứng ở trên, hãy soạn thảo bản Overview giải pháp chuyên nghiệp gồm: Tầm nhìn giải pháp, Kiến trúc đề xuất, Các phân hệ cốt lõi, Cam kết bảo mật/tuân thủ, và Lý do tại sao giải pháp này tối ưu.`;
    }

    // 3. Generate: Gọi Qwen1.5-4B LoRA fine-tuned model (Task 5: Proposal Builder)
    const output = await AIClient.generate({
      taskMode: 5,
      prompt: augmentedPrompt,
      temperature: 0.2
    });

    return {
      overview: output,
      sources: relevantChunks
    };
  }
}

