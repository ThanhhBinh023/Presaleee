import { Pool } from 'pg';
import { IPortalRepository, PortalSessionContext } from '../../../domain/repositories/IPortalRepository.js';
import { PortalComment, PortalMaterial, PortalSession } from '../../../domain/entities/Portal.js';

function mapSession(row: any): PortalSessionContext {
  return {
    id: row.id, proposalId: row.proposal_id, organizationId: row.organization_id,
    clientEmail: row.client_email, clientName: row.client_name,
    expiresAt: new Date(row.expires_at).toISOString()
  };
}

export class PostgresPortalRepository implements IPortalRepository {
  constructor(private readonly pool: Pool) {}

  async createSession(input: {
    proposalId: string; organizationId: string; createdBy: string; clientEmail: string;
    clientName: string | null; tokenHash: string; expiresAt: string;
  }): Promise<PortalSession | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const proposal = await client.query(
        'SELECT status FROM proposals WHERE id = $1 AND organization_id = $2 FOR UPDATE;',
        [input.proposalId, input.organizationId]
      );
      if (!proposal.rows[0] || !['APPROVED', 'SENT_TO_CLIENT', 'ACCEPTED'].includes(proposal.rows[0].status)) {
        await client.query('ROLLBACK');
        return null;
      }
      if (proposal.rows[0].status === 'APPROVED') {
        await client.query("UPDATE proposals SET status = 'SENT_TO_CLIENT', updated_at = NOW() WHERE id = $1 AND organization_id = $2;", [input.proposalId, input.organizationId]);
        await client.query(
          `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, payload)
           VALUES ($1, $2, 'PROPOSAL_SHARED_WITH_CLIENT', 'proposal', $3, $4::jsonb);`,
          [input.organizationId, input.createdBy, input.proposalId, JSON.stringify({ clientEmail: input.clientEmail })]
        );
      }
      const result = await client.query(
        `INSERT INTO portal_sessions (proposal_id, organization_id, created_by, client_email, client_name, token_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
         RETURNING id, proposal_id, organization_id, client_email, client_name, expires_at;`,
        [input.proposalId, input.organizationId, input.createdBy, input.clientEmail, input.clientName, input.tokenHash, input.expiresAt]
      );
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, payload)
         VALUES ($1, $2, 'CLIENT_PORTAL_SESSION_CREATED', 'proposal', $3, $4::jsonb);`,
        [input.organizationId, input.createdBy, input.proposalId,
          JSON.stringify({ sessionId: result.rows[0].id, clientEmail: input.clientEmail, expiresAt: input.expiresAt })]
      );
      await client.query('COMMIT');
      return mapSession(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async findActiveSession(tokenHash: string, proposalId: string): Promise<PortalSessionContext | null> {
    const result = await this.pool.query(
      `UPDATE portal_sessions s SET last_accessed_at = NOW()
       FROM proposals p WHERE s.proposal_id = p.id AND s.token_hash = $1 AND s.proposal_id = $2
         AND s.revoked_at IS NULL AND s.expires_at > NOW()
         AND p.status IN ('SENT_TO_CLIENT', 'ACCEPTED')
       RETURNING s.id, s.proposal_id, s.organization_id, s.client_email, s.client_name, s.expires_at;`,
      [tokenHash, proposalId]
    );
    return result.rows[0] ? mapSession(result.rows[0]) : null;
  }

  async revokeSession(sessionId: string, organizationId: string, actorId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE portal_sessions SET revoked_at = NOW()
         WHERE id = $1 AND organization_id = $2 AND revoked_at IS NULL
         RETURNING proposal_id;`,
        [sessionId, organizationId]
      );
      if (!result.rows[0]) { await client.query('ROLLBACK'); return false; }
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, payload)
         VALUES ($1, $2, 'CLIENT_PORTAL_SESSION_REVOKED', 'proposal', $3, $4::jsonb);`,
        [organizationId, actorId, result.rows[0].proposal_id, JSON.stringify({ sessionId })]
      );
      await client.query('COMMIT');
      return true;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async listComments(proposalId: string, organizationId: string): Promise<PortalComment[]> {
    const result = await this.pool.query(
      `SELECT * FROM (
         SELECT id, proposal_id, portal_session_id, author_name, author_email, body, created_at
         FROM proposal_portal_comments WHERE proposal_id = $1 AND organization_id = $2
         ORDER BY created_at DESC LIMIT 500
       ) recent_comments ORDER BY created_at ASC;`,
      [proposalId, organizationId]
    );
    return result.rows.map(row => ({
      id: row.id, proposalId: row.proposal_id, sessionId: row.portal_session_id,
      authorName: row.author_name, authorEmail: row.author_email, body: row.body,
      createdAt: new Date(row.created_at).toISOString()
    }));
  }

  async createComment(input: {
    proposalId: string; organizationId: string; sessionId: string;
    authorName: string; body: string;
  }): Promise<PortalComment | null> {
    const result = await this.pool.query(
      `INSERT INTO proposal_portal_comments (proposal_id, organization_id, portal_session_id, author_name, author_email, body)
       SELECT s.proposal_id, s.organization_id, s.id, $4, s.client_email, $5
       FROM portal_sessions s JOIN proposals p ON p.id = s.proposal_id
       WHERE s.id = $3 AND s.proposal_id = $1 AND s.organization_id = $2
         AND s.revoked_at IS NULL AND s.expires_at > NOW() AND p.status IN ('SENT_TO_CLIENT', 'ACCEPTED')
       RETURNING id, proposal_id, portal_session_id, author_name, author_email, body, created_at;`,
      [input.proposalId, input.organizationId, input.sessionId, input.authorName, input.body]
    );
    const row = result.rows[0];
    return row ? {
      id: row.id, proposalId: row.proposal_id, sessionId: row.portal_session_id,
      authorName: row.author_name, authorEmail: row.author_email, body: row.body,
      createdAt: new Date(row.created_at).toISOString()
    } : null;
  }

  async listMaterials(proposalId: string, organizationId: string): Promise<PortalMaterial[]> {
    const result = await this.pool.query(
      `SELECT id, title, description, file_name, file_url, mime_type, created_at
       FROM proposal_portal_materials WHERE proposal_id = $1 AND organization_id = $2 AND is_shared = TRUE
       ORDER BY created_at DESC;`,
      [proposalId, organizationId]
    );
    return result.rows.map(row => ({
      id: row.id, title: row.title, description: row.description, fileName: row.file_name,
      fileUrl: row.file_url, mimeType: row.mime_type, createdAt: new Date(row.created_at).toISOString()
    }));
  }

  async createMaterial(input: {
    proposalId: string; organizationId: string; createdBy: string; title: string;
    description: string | null; fileName: string; fileUrl: string; mimeType: string | null; isShared: boolean;
  }): Promise<PortalMaterial | null> {
    const result = await this.pool.query(
      `INSERT INTO proposal_portal_materials
        (proposal_id, organization_id, created_by, title, description, file_name, file_url, mime_type, is_shared)
       SELECT p.id, p.organization_id, $3, $4, $5, $6, $7, $8, $9
       FROM proposals p WHERE p.id = $1 AND p.organization_id = $2 AND p.status IN ('APPROVED', 'SENT_TO_CLIENT', 'ACCEPTED')
       RETURNING id, title, description, file_name, file_url, mime_type, created_at;`,
      [input.proposalId, input.organizationId, input.createdBy, input.title, input.description,
        input.fileName, input.fileUrl, input.mimeType, input.isShared]
    );
    const row = result.rows[0];
    return row ? {
      id: row.id, title: row.title, description: row.description, fileName: row.file_name,
      fileUrl: row.file_url, mimeType: row.mime_type, createdAt: new Date(row.created_at).toISOString()
    } : null;
  }

  async deleteMaterial(proposalId: string, materialId: string, organizationId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM proposal_portal_materials WHERE proposal_id = $1 AND id = $2 AND organization_id = $3 RETURNING id;`,
      [proposalId, materialId, organizationId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
