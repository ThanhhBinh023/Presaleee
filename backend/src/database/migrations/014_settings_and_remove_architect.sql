-- ==============================================================================
-- 014: SETTINGS SYSTEM (ACCOUNT, PROJECT WORKSPACE, SYSTEM ADMIN) & ROLE CLEANUP
-- ==============================================================================

-- 1. Migrate legacy SOLUTION_ARCHITECT roles to PRESALE_CONSULTANT
UPDATE users
SET role = 'PRESALE_CONSULTANT', updated_at = NOW()
WHERE role = 'SOLUTION_ARCHITECT';

UPDATE project_memberships
SET project_role = 'PRESALE_CONSULTANT', updated_at = NOW()
WHERE project_role = 'SOLUTION_ARCHITECT';

-- 2. Account Settings fields on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS job_title VARCHAR(150),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS display_signature TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS external_integrations JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- 3. In-app Notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_key VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON user_notifications (user_id, is_read, created_at DESC);

-- 4. Project / Lead Workspace Settings & Lifecycle fields on leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS industry VARCHAR(150),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archive_outcome VARCHAR(50),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS project_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 5. Project Invitations table (Pending Invitations: Resend / Revoke / Accept)
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_role VARCHAR(50) NOT NULL DEFAULT 'VIEWER',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REVOKED'
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_invitations_project_status
  ON project_invitations (project_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_invitations_email_pending
  ON project_invitations (lower(email), status);

-- 6. System Settings table (System Admin only)
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (key, value)
VALUES
  (
    'security_policy',
    '{
      "minPasswordLength": 12,
      "sessionTimeoutMinutes": 1440,
      "maxFailedLoginAttempts": 5,
      "lockoutDurationMinutes": 15
    }'::jsonb
  ),
  (
    'ai_config',
    '{
      "activeProvider": "GEMINI",
      "defaultModel": "gemini-2.5-flash",
      "fallbackEnabled": true,
      "requestsPerMinute": 60,
      "dailyTokenQuota": 1000000,
      "maxProposalsPerDay": 100
    }'::jsonb
  )
ON CONFLICT (key) DO NOTHING;
