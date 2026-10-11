-- ==============================================================================
-- PRESALEEE COMPREHENSIVE DATABASE SCHEMA (SUPABASE POSTGRESQL + PGVECTOR)
-- Bao gồm: Multi-tenancy, Auth & RBAC, CRM Leads, Meetings, Knowledge Vault (RAG),
--          Proposals (10 Sheets Engine), Rate Cards, và Audit Logging.
-- ==============================================================================

-- 1. KÍCH HOẠT EXTENSIONS
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. PHÂN HỆ AUTHENTICATION, ORGANIZATIONS & PHÂN QUYỀN (RBAC)
-- ==============================================================================

-- 2.1. Tổ chức / Doanh nghiệp (Multi-tenancy)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100),
    plan VARCHAR(50) DEFAULT 'FREE',               -- 'FREE', 'PRO', 'ENTERPRISE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2. Người dùng hệ thống (Tích hợp hoặc liên kết Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supabase_auth_id UUID UNIQUE,                  -- Liên kết với auth.users của Supabase
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'PRESALE_CONSULTANT', -- 'ADMIN', 'PRESALE_LEAD', 'SOLUTION_ARCHITECT', 'SALES_REP', 'VIEWER'
    status VARCHAR(50) DEFAULT 'ACTIVE',           -- 'ACTIVE', 'INVITED', 'DEACTIVATED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 3. PHÂN HỆ KHÁCH HÀNG & QUẢN LÝ LEADS (CRM & RFP INTAKE)
-- ==============================================================================

-- 3.1. Thông tin Khách hàng Doanh nghiệp
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),                         -- 'Retail', 'Fintech', 'Healthcare', 'Logistics',...
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    country VARCHAR(100) DEFAULT 'Vietnam',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.2. Leads & Yêu cầu RFP
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- Presale phụ trách chính
    
    title VARCHAR(255) NOT NULL,                   -- Ví dụ: 'Omnichannel Retail Mobile & POS'
    source VARCHAR(100) DEFAULT 'INBOUND_EMAIL',   -- 'INBOUND_EMAIL', 'WEBSITE', 'REFERRAL', 'MEETING'
    status VARCHAR(50) DEFAULT 'NEW',              -- 'NEW', 'QUALIFYING', 'QUALIFIED', 'PROPOSAL_DRAFTING', 'WON', 'LOST'
    
    -- Dữ liệu RFP thô từ khách hàng
    raw_rfp_content TEXT NOT NULL,
    
    -- Dữ liệu AI trích xuất (Task 1: AI Intake)
    extracted_metadata JSONB DEFAULT '{}'::jsonb,  -- { budget, timeline_weeks, modules, tech_stack, compliance }
    
    -- Đánh giá BANT từ AI (Task 4: Qualification Engine)
    bant_score INTEGER CHECK (bant_score >= 0 AND bant_score <= 100),
    bant_details JSONB DEFAULT '{}'::jsonb,        -- { budget_eval, authority_eval, need_eval, timeline_eval, risks }
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 4. PHÂN HỆ CUỘC HỌP & GHI CHÚ (MEETING MANAGEMENT - TASK 2 & 3)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL,
    meeting_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    audio_record_url TEXT,                         -- File ghi âm trên Supabase Storage
    
    -- AI dọn dẹp & phân tích (Task 2 & 3)
    raw_transcript TEXT,                           -- Transcript thô có từ đệm
    clean_notes TEXT,                              -- Tóm tắt sạch do AI dọn dẹp
    action_items JSONB DEFAULT '[]'::jsonb,        -- [{ task, assignee, deadline }]
    gap_analysis JSONB DEFAULT '{}'::jsonb,        -- Phân tích lỗ hổng thông tin & câu hỏi gợi ý
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 5. PHÂN HỆ KNOWLEDGE VAULT & RAG (PGVECTOR 1024 DIMS - BGE-M3)
-- ==============================================================================

-- 5.1. Thư mục / Danh mục tài liệu mẫu
CREATE TABLE IF NOT EXISTS knowledge_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,                -- 'PROPOSAL_TEMPLATE', 'TECH_SPEC', 'CASE_STUDY', 'RATE_CARD', 'POLICY'
    domain VARCHAR(100) DEFAULT 'GENERAL',         -- 'Retail', 'Banking', 'Healthcare',...
    file_url TEXT,                                 -- URL file gốc (PDF/Docx) trên Supabase Storage
    file_type VARCHAR(50),
    total_tokens INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5.2. Chunks & Vector Embeddings 1024 chiều
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id UUID REFERENCES knowledge_docs(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,            -- { domain, category, title, section }
    embedding VECTOR(1024),                        -- Embedding từ mô hình BAAI/bge-m3
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index HNSW cho tìm kiếm vector siêu tốc
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- ==============================================================================
-- 6. PHÂN HỆ RATE CARD & BÁO GIÁ NGUỒN LỰC
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rate_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,               -- 'Project Manager', 'Solution Architect', 'Senior Backend Dev',...
    level VARCHAR(50) DEFAULT 'SENIOR',            -- 'JUNIOR', 'MID', 'SENIOR', 'LEAD'
    hourly_rate_usd NUMERIC(10, 2) NOT NULL,
    daily_rate_usd NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 7. PHÂN HỆ PROPOSALS & BỘ 10 SHEETS NỘI DUNG (TASK 5 & 6)
-- ==============================================================================

-- 7.1. Bảng Thông tin chung Proposal
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL,
    version VARCHAR(20) DEFAULT 'v1.0',
    status VARCHAR(50) DEFAULT 'DRAFT',            -- 'DRAFT', 'IN_REVIEW', 'APPROVED', 'SENT_TO_CLIENT', 'ACCEPTED', 'REJECTED'
    
    total_cost NUMERIC(15, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    estimated_timeline_weeks INTEGER,
    
    export_excel_url TEXT,                         -- URL file Excel xuất ra lưu trên Supabase Storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7.2. Người cùng cộng tác trong Proposal
CREATE TABLE IF NOT EXISTS proposal_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(50) DEFAULT 'EDITOR',       -- 'VIEWER', 'EDITOR', 'APPROVER'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(proposal_id, user_id)
);

-- 7.3. 10 Sheets nội dung chi tiết theo chuẩn Proposal của Presaleee
CREATE TABLE IF NOT EXISTS proposal_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
    
    -- Danh sách 10 sheets chuẩn:
    -- 'Overview', 'Project Roles', 'Project Management Approach', 'RAID', 
    -- 'Acceptance Docs', 'FR', 'Tech-stack', 'Non-FR', 'RateCard', 'Macro Plan & Quotation'
    sheet_name VARCHAR(100) NOT NULL,
    sheet_order INTEGER NOT NULL,                  -- Thứ tự hiển thị 1 -> 10
    
    sheet_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Toàn bộ bảng tính, dòng, cột dạng JSON
    ai_generated BOOLEAN DEFAULT FALSE,            -- Đánh dấu sheet này do AI sinh hay người nhập
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(proposal_id, sheet_name)
);

-- ==============================================================================
-- 8. PHÂN HỆ AUDIT LOGGING & AI ACTIVITY TRACKING
-- ==============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    action VARCHAR(100) NOT NULL,                  -- 'AI_EXTRACT_LEAD', 'RAG_SEARCH', 'AI_GENERATE_PROPOSAL', 'UPDATE_SHEET'
    entity_type VARCHAR(100) NOT NULL,             -- 'lead', 'proposal', 'knowledge_doc'
    entity_id UUID,
    
    payload JSONB DEFAULT '{}'::jsonb,             -- Dữ liệu request / input
    result_status VARCHAR(50) DEFAULT 'SUCCESS',   -- 'SUCCESS', 'FAILED'
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 9. RPC FUNCTION: match_document_chunks (TÌM KIẾM NGỮ CẢNH RAG CÓ PHÂN QUYỀN)
-- ==============================================================================

CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding VECTOR(1024),
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
