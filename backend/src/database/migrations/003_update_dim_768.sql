-- ==============================================================================
-- MIGRATION 003: UPDATE EMBEDDING DIMENSION TO 768
-- Model: sentence-transformers/paraphrase-multilingual-mpnet-base-v2 (~970MB, 768 dims)
-- ==============================================================================

-- 1. Xóa index cũ trước khi đổi kiểu dữ liệu cột
DROP INDEX IF EXISTS idx_chunks_embedding_hnsw;

-- 2. Dọn dẹp dữ liệu cũ (1024 dims) để đổi sang kiểu 768 dims sạch sẽ
TRUNCATE TABLE document_chunks CASCADE;
TRUNCATE TABLE knowledge_docs CASCADE;

-- 3. Cập nhật cột embedding từ vector(1024) sang vector(768)
ALTER TABLE document_chunks 
ALTER COLUMN embedding TYPE vector(768);

-- 4. Tạo lại chỉ mục HNSW cho vector(768)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- 4. Cập nhật hàm RPC match_document_chunks nhận vector(768)
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 5,
    filter_organization_id UUID DEFAULT NULL,
    filter_domain VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    doc_id UUID,
    chunk_content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.doc_id,
        dc.chunk_content,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    JOIN knowledge_docs kd ON dc.doc_id = kd.id
    WHERE 
        (filter_organization_id IS NULL OR kd.organization_id = filter_organization_id)
        AND (filter_domain IS NULL OR kd.domain = filter_domain)
        AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 5. Cập nhật hàm RPC hybrid_search_chunks nhận vector(768)
CREATE OR REPLACE FUNCTION hybrid_search_chunks(
    query_text TEXT,
    query_embedding VECTOR(768),
    match_count INT DEFAULT 5,
    full_text_weight FLOAT DEFAULT 1.0,
    semantic_weight FLOAT DEFAULT 1.0,
    rrf_k INT DEFAULT 60,
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
    -- 1. Tìm kiếm theo Dense Vector (768 dims) lấy Top 20
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
    -- 2. Tìm kiếm theo Full-Text Search lấy Top 20
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
