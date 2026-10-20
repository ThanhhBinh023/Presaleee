import { Pool } from 'pg';
import { AuthSessionContext, AuthUser } from '../../../domain/entities/AuthUser.js';
import { IAuthRepository } from '../../../domain/repositories/IAuthRepository.js';

interface AuthUserRow {
  id: string;
  organization_id: string | null;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  status: string;
  password_hash?: string | null;
}

function mapUser(row: AuthUserRow): AuthUser {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    status: row.status,
    passwordHash: row.password_hash || undefined
  };
}

export class PostgresAuthRepository implements IAuthRepository {
  constructor(private readonly pool: Pool) {}

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const result = await this.pool.query<AuthUserRow>(
      `SELECT id, organization_id, email, full_name, avatar_url, role, status, password_hash
       FROM users WHERE lower(email) = $1 LIMIT 1;`,
      [email]
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const result = await this.pool.query<AuthUserRow>(
      `SELECT id, organization_id, email, full_name, avatar_url, role, status, password_hash
       FROM users WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async createRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    context: AuthSessionContext
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO auth_refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5);`,
      [userId, tokenHash, expiresAt, context.userAgent || null, context.ipAddress || null]
    );
  }

  async rotateRefreshToken(
    tokenHash: string,
    newTokenHash: string,
    newExpiresAt: Date,
    context: AuthSessionContext
  ): Promise<AuthUser | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const session = await client.query<{ user_id: string }>(
        `SELECT user_id FROM auth_refresh_tokens
         WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
         FOR UPDATE;`,
        [tokenHash]
      );
      if (!session.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }

      const userResult = await client.query<AuthUserRow>(
        `SELECT id, organization_id, email, full_name, avatar_url, role, status
         FROM users WHERE id = $1 AND status = 'ACTIVE' FOR UPDATE;`,
        [session.rows[0].user_id]
      );
      if (!userResult.rows[0]) {
        await client.query(
          `UPDATE auth_refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1;`,
          [tokenHash]
        );
        await client.query('COMMIT');
        return null;
      }

      await client.query(
        `UPDATE auth_refresh_tokens SET revoked_at = NOW(), replaced_by_hash = $2 WHERE token_hash = $1;`,
        [tokenHash, newTokenHash]
      );
      await client.query(
        `INSERT INTO auth_refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, $5);`,
        [userResult.rows[0].id, newTokenHash, newExpiresAt, context.userAgent || null, context.ipAddress || null]
      );
      await client.query('COMMIT');
      return mapUser(userResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.pool.query(
      `UPDATE auth_refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE token_hash = $1;`,
      [tokenHash]
    );
  }

  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE auth_password_reset_tokens SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL;`,
        [userId]
      );
      await client.query(
        `INSERT INTO auth_password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3);`,
        [userId, tokenHash, expiresAt]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async resetPassword(tokenHash: string, newPasswordHash: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const token = await client.query<{ user_id: string }>(
        `SELECT user_id FROM auth_password_reset_tokens
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
         FOR UPDATE;`,
        [tokenHash]
      );
      if (!token.rows[0]) {
        await client.query('ROLLBACK');
        return false;
      }

      await client.query(
        `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1;`,
        [token.rows[0].user_id, newPasswordHash]
      );
      await client.query(
        `UPDATE auth_password_reset_tokens SET used_at = NOW() WHERE token_hash = $1;`,
        [tokenHash]
      );
      await client.query(
        `UPDATE auth_refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW())
         WHERE user_id = $1 AND revoked_at IS NULL;`,
        [token.rows[0].user_id]
      );
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
