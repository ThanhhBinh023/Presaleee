-- ==============================================================================
-- 009: PROJECT-BASED ACCESS CONTROL (PBAC) - PROJECT MEMBERSHIPS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS project_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_role VARCHAR(50) NOT NULL DEFAULT 'VIEWER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_project_memberships_user UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_memberships_user ON project_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_project_memberships_project ON project_memberships(project_id);

-- Tự động seed cho các Lead hiện có: Gán created_by hoặc assigned_to làm PRESALE_LEAD nếu chưa có membership
INSERT INTO project_memberships (project_id, user_id, project_role)
SELECT l.id, COALESCE(l.created_by, l.assigned_to, u.id), 'PRESALE_LEAD'
FROM leads l
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE organization_id = l.organization_id LIMIT 1
) u
ON CONFLICT (project_id, user_id) DO NOTHING;
