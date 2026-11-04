-- Authentication credentials and revocable sessions for the existing users table.
-- This migration is additive and preserves existing user rows.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    replaced_by_hash CHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_active
ON auth_refresh_tokens (user_id, expires_at)
WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_password_reset_tokens_user_active
ON auth_password_reset_tokens (user_id, expires_at)
WHERE used_at IS NULL;

COMMENT ON COLUMN users.password_hash IS 'scrypt encoded password hash (algorithm$salt$derived_key); nullable for users not yet provisioned with a local password.';
