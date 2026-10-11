-- ==============================================================================
-- PRESALEEE DATABASE SCHEMA (SUPABASE POSTGRESQL + PGVECTOR)
-- Model Embedding: BAAI/bge-m3 (vector dimension = 1024)
-- ==============================================================================

-- 1. Kích hoạt extension pgvector và uuid-ossp
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. Bảng LEADS (Thông tin khách hàng & Yêu cầu RFP ban đầu)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,                    -- Ví dụ: 'Omnichannel Retail Mobile & POS'
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_domain VARCHAR(100),                     -- 'Retail / E-Commerce', 'Fintech', 'Healthcare',...
    raw_rfp_content TEXT NOT NULL,                  -- Nội dung raw khách gửi (email, text, note)
    extracted_metadata JSONB,                       -- Kết quả trích xuất Task 1 từ AI (budget, timeline, modules, stack)
    status VARCHAR(50) DEFAULT 'NEW',               -- 'NEW', 'QUALIFIED', 'PROPOSAL_DRAFTING', 'WON', 'LOST'
    bant_score INTEGER,                             -- Điểm BANT 0-100 từ Task 4
    bant_details JSONB,                             -- Chi tiết phân tích rủi ro & giải thích điểm
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. Bảng MEETINGS & TRANSCRIPTS (Quản lý cuộc họp & ghi chú sau họp)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    meeting_title VARCHAR(255) NOT NULL,
    meeting_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_transcript TEXT,                            -- Transcript thô có từ đệm (um, ah,...)
    clean_notes TEXT,                               -- Bản ghi chép sạch do AI dọn dẹp (Task 2)
    action_items JSONB,                             -- Danh sách việc cần làm kèm người chịu trách nhiệm
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. Bảng KNOWLEDGE_DOCS (Kho tri thức mẫu: Proposal cũ, Rate Card, Case Study)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,                 -- 'PROPOSAL_TEMPLATE', 'TECH_SPEC', 'CASE_STUDY', 'RATE_CARD'
    domain VARCHAR(100),                            -- 'Retail', 'Banking', 'Logistics',...
    source_url TEXT,                                -- Link lưu file trên Supabase Storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. Bảng DOCUMENT_CHUNKS (Chunks & Vector Embeddings 1024 chiều từ bge-m3)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id UUID REFERENCES knowledge_docs(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,             -- Metadata để filter: { domain: 'Retail', tech: ['React Native'] }
    embedding VECTOR(1024),                         -- Vector embedding từ model BAAI/bge-m3
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo Index HNSW để tìm kiếm cosine similarity siêu tốc (chỉ số chuẩn cho RAG lớn)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- ------------------------------------------------------------------------------
-- 6. Bảng PROPOSALS & 10 SHEETS NỘI DUNG
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    version VARCHAR(20) DEFAULT 'v1.0',
    total_cost NUMERIC(15, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    timeline_weeks INTEGER,
    status VARCHAR(50) DEFAULT 'DRAFT',             -- 'DRAFT', 'IN_REVIEW', 'SENT', 'ACCEPTED'
    export_file_url TEXT,                           -- Link file Excel .xlsx 10 sheets trên Supabase Storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposal_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
    sheet_name VARCHAR(100) NOT NULL,               -- 'Overview', 'Project Roles', 'Management Approach', 'RAID', 
                                                    -- 'Acceptance Docs', 'FR', 'Tech-stack', 'Non-FR', 'RateCard', 'Quotation'
    sheet_order INTEGER NOT NULL,
    sheet_data JSONB NOT NULL,                      -- Dữ liệu bảng tính dạng JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. FUNCTION RPC: match_document_chunks (Dùng để tìm kiếm ngữ cảnh RAG)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding VECTOR(1024),
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 5,
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
        (filter_domain IS NULL OR kd.domain = filter_domain)
        AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
