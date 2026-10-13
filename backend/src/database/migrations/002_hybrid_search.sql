-- ==============================================================================
-- MIGRATION 002: HYBRID SEARCH ENHANCEMENT (DENSE VECTOR + FULL-TEXT SEARCH)
-- Sử dụng Reciprocal Rank Fusion (RRF) để kết hợp pgvector (1024 dims) và GIN FTS
-- ==============================================================================

-- 1. Thêm cột tsvector tự động tính toán từ chunk_content
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS fts tsvector 
GENERATED ALWAYS AS (to_tsvector('english', chunk_content)) STORED;

-- 2. Tạo chỉ mục GIN cho Full-Text Search siêu tốc
CREATE INDEX IF NOT EXISTS idx_chunks_fts_gin 
ON document_chunks 
USING gin(fts);

-- 3. Tạo hàm RPC: hybrid_search_chunks (Kết hợp Dense Vector + BM25/FTS bằng RRF)
-- Thuật toán RRF: Score = 1 / (k + rank), mặc định hằng số k = 60 (chuẩn công nghiệp)
CREATE OR REPLACE FUNCTION hybrid_search_chunks(
    query_text TEXT,                       -- Câu truy vấn text dùng cho Full-Text Search
    query_embedding VECTOR(1024),          -- Vector embedding dùng cho Dense Search
    match_count INT DEFAULT 5,             -- Số lượng kết quả cuối cùng cần lấy
    full_text_weight FLOAT DEFAULT 1.0,    -- Trọng số cho Keyword Search
    semantic_weight FLOAT DEFAULT 1.0,     -- Trọng số cho Vector Search
    rrf_k INT DEFAULT 60,                  -- Hằng số RRF (thường chọn 60)
    filter_organization_id UUID DEFAULT NULL,
    filter_domain VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    doc_id UUID,
    chunk_content TEXT,
    metadata JSONB,
    combined_score FLOAT,
    semantic_rank INT,
    fts_rank INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH 
    -- 1. Tìm kiếm theo Dense Vector (Semantic Search) lấy Top 20
    semantic_search AS (
        SELECT 
            dc.id,
            ROW_NUMBER() OVER (ORDER BY dc.embedding <=> query_embedding) AS rank
        FROM document_chunks dc
        JOIN knowledge_docs kd ON dc.doc_id = kd.id
        WHERE 
            (filter_organization_id IS NULL OR kd.organization_id = filter_organization_id)
            AND (filter_domain IS NULL OR kd.domain = filter_domain)
        ORDER BY dc.embedding <=> query_embedding
        LIMIT 20
    ),
    -- 2. Tìm kiếm theo Full-Text Search (Keyword Match) lấy Top 20
    fts_search AS (
        SELECT 
            dc.id,
            ROW_NUMBER() OVER (ORDER BY ts_rank(dc.fts, plainto_tsquery('english', query_text)) DESC) AS rank
        FROM document_chunks dc
        JOIN knowledge_docs kd ON dc.doc_id = kd.id
        WHERE 
            dc.fts @@ plainto_tsquery('english', query_text)
            AND (filter_organization_id IS NULL OR kd.organization_id = filter_organization_id)
            AND (filter_domain IS NULL OR kd.domain = filter_domain)
        ORDER BY ts_rank(dc.fts, plainto_tsquery('english', query_text)) DESC
        LIMIT 20
    )
    -- 3. Kết hợp kết quả bằng Reciprocal Rank Fusion (RRF)
    SELECT 
        dc.id,
        dc.doc_id,
        dc.chunk_content,
        dc.metadata,
        (
            COALESCE(1.0 / (rrf_k + ss.rank), 0.0) * semantic_weight +
            COALESCE(1.0 / (rrf_k + fs.rank), 0.0) * full_text_weight
        )::FLOAT AS combined_score,
        ss.rank::INT AS semantic_rank,
        fs.rank::INT AS fts_rank
    FROM document_chunks dc
    LEFT JOIN semantic_search ss ON dc.id = ss.id
    LEFT JOIN fts_search fs ON dc.id = fs.id
    WHERE ss.id IS NOT NULL OR fs.id IS NOT NULL
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$;

