import { Pool } from 'pg';
import {
  AccountSettingsView,
  ActiveAuthSession,
  DEFAULT_SYSTEM_AI_CONFIG,
  DEFAULT_SYSTEM_SECURITY_POLICY,
  ExternalIntegrations,
  NotificationEventKey,
  NotificationPreferences,
  ProjectInvitationItem,
  ProjectSettingsPayload,
  SystemAIConfig,
  SystemSecurityPolicy,
  UserNotificationItem,
  normalizeExternalIntegrations,
  normalizeNotificationPreferences,
  normalizeProjectSettings
} from '../../../domain/entities/Settings.js';
import { USER_ROLES, UserRole, UserStatus, toUserRole, toUserStatus } from '../../../domain/entities/AuthUser.js';
import { hashToken, createOpaqueToken } from '../../../application/services/AuthTokenService.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../domain/errors/AppError.js';

function maskApiKey(raw?: string): string | undefined {
  if (!raw || raw.length < 8) return raw ? '••••••••' : undefined;
  return `${raw.slice(0, 4)}••••••••${raw.slice(-4)}`;
}

const SENSITIVE_AUDIT_KEYS = new Set([
  'rawRfpContent',
  'raw_rfp_content',
  'transcript',
  'rawTranscript',
  'raw_transcript',
  'cleanNotes',
  'clean_notes',
  'sheetData',
  'sheet_data',
  'sheets',
  'prompt',
  'body',
  'content',
  'messages',
  'password',
  'passwordHash',
  'apiKey',
  'customApiKey',
  'passcode',
  'passcodeHash',
  'twoFactorSecret'
]);

function sanitizeAuditPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(payload as Record<string, unknown>)) {
    if (SENSITIVE_AUDIT_KEYS.has(key)) {
      result[key] = '[REDACTED_FOR_MULTI_TENANT_PRIVACY]';
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = sanitizeAuditPayload(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export class PostgresSettingsRepository {
  constructor(private readonly pool: Pool) {}

  // ============================================================================
  // 1. ACCOUNT SETTINGS
  // ============================================================================

  async getAccountSettings(userId: string, currentRefreshTokenHash?: string): Promise<AccountSettingsView> {
    const userRes = await this.pool.query(
      `SELECT id, email, full_name, avatar_url, role, job_title, phone, display_signature,
              two_factor_enabled, notification_preferences, external_integrations
       FROM users WHERE id = $1 LIMIT 1;`,
      [userId]
    );
    const u = userRes.rows[0];
    if (!u) throw new NotFoundError('User not found.');

    const sessionsRes = await this.pool.query(
      `SELECT id, token_hash, user_agent, ip_address, created_at, expires_at
       FROM auth_refresh_tokens
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 30;`,
      [userId]
    );

    const activeSessions: ActiveAuthSession[] = sessionsRes.rows.map(row => ({
      id: row.id,
      userAgent: row.user_agent,
      ipAddress: row.ip_address ? String(row.ip_address) : null,
      createdAt: new Date(row.created_at).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString(),
      isCurrent: Boolean(currentRefreshTokenHash && row.token_hash === currentRefreshTokenHash)
    }));

    return {
      profile: {
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        avatarUrl: u.avatar_url,
        role: toUserRole(u.role),
        jobTitle: u.job_title || '',
        phone: u.phone || '',
        displaySignature: u.display_signature || ''
      },
      security: {
        twoFactorEnabled: Boolean(u.two_factor_enabled),
        activeSessions
      },
      notifications: normalizeNotificationPreferences(u.notification_preferences),
      integrations: normalizeExternalIntegrations(u.external_integrations)
    };
  }

  async updateOwnExtendedProfile(
    userId: string,
    input: {
      fullName?: string;
      avatarUrl?: string | null;
      jobTitle?: string;
      phone?: string;
      displaySignature?: string;
    }
  ) {
    const res = await this.pool.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           avatar_url = CASE WHEN $2::boolean THEN $3 ELSE avatar_url END,
           job_title = COALESCE($4, job_title),
           phone = COALESCE($5, phone),
           display_signature = COALESCE($6, display_signature),
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, email, full_name, avatar_url, role, status, organization_id, job_title, phone, display_signature;`,
      [
        input.fullName ?? null,
        input.avatarUrl !== undefined,
        input.avatarUrl ?? null,
        input.jobTitle ?? null,
        input.phone ?? null,
        input.displaySignature ?? null,
        userId
      ]
    );
    if (!res.rows[0]) throw new NotFoundError('User not found.');
    const r = res.rows[0];
    return {
      id: r.id,
      organizationId: r.organization_id,
      email: r.email,
      fullName: r.full_name,
      avatarUrl: r.avatar_url,
      role: toUserRole(r.role),
      status: toUserStatus(r.status),
      jobTitle: r.job_title || '',
      phone: r.phone || '',
      displaySignature: r.display_signature || ''
    };
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2;`, [passwordHash, userId]);
      await client.query(
        `UPDATE auth_refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = $1 AND revoked_at IS NULL;`,
        [userId]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeOtherSessions(userId: string, currentRefreshTokenHash?: string): Promise<number> {
    if (currentRefreshTokenHash) {
      const res = await this.pool.query(
        `UPDATE auth_refresh_tokens
         SET revoked_at = NOW()
         WHERE user_id = $1 AND revoked_at IS NULL AND token_hash <> $2;`,
        [userId, currentRefreshTokenHash]
      );
      return res.rowCount ?? 0;
    }
    const res = await this.pool.query(
      `UPDATE auth_refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL;`,
      [userId]
    );
    return res.rowCount ?? 0;
  }

  async revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE auth_refresh_tokens
       SET revoked_at = NOW()
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL;`,
      [sessionId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async getTwoFactorState(userId: string): Promise<{ enabled: boolean; secret: string | null; email: string }> {
    const res = await this.pool.query<{ two_factor_enabled: boolean; two_factor_secret: string | null; email: string }>(
      `SELECT two_factor_enabled, two_factor_secret, email FROM users WHERE id = $1 LIMIT 1;`,
      [userId]
    );
    if (!res.rows[0]) throw new NotFoundError('User not found.');
    return {
      enabled: Boolean(res.rows[0].two_factor_enabled),
      secret: res.rows[0].two_factor_secret,
      email: res.rows[0].email
    };
  }

  async setPendingTwoFactorSecret(userId: string, secret: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET two_factor_secret = $1, updated_at = NOW() WHERE id = $2;`,
      [secret, userId]
    );
  }

  async enableTwoFactor(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET two_factor_enabled = TRUE, updated_at = NOW() WHERE id = $1;`,
      [userId]
    );
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL, updated_at = NOW() WHERE id = $1;`,
      [userId]
    );
  }

  async updateNotificationPreferences(userId: string, prefs: NotificationPreferences): Promise<NotificationPreferences> {
    const normalized = normalizeNotificationPreferences(prefs);
    await this.pool.query(
      `UPDATE users SET notification_preferences = $1::jsonb, updated_at = NOW() WHERE id = $2;`,
      [JSON.stringify(normalized), userId]
    );
    return normalized;
  }

  async updateExternalIntegrations(userId: string, integrations: ExternalIntegrations): Promise<ExternalIntegrations> {
    const normalized = normalizeExternalIntegrations(integrations);
    await this.pool.query(
      `UPDATE users SET external_integrations = $1::jsonb, updated_at = NOW() WHERE id = $2;`,
      [JSON.stringify(normalized), userId]
    );
    return normalized;
  }

  async createInAppNotification(input: {
    userId: string;
    organizationId: string | null;
    eventKey: NotificationEventKey;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  }): Promise<void> {
    const userRes = await this.pool.query<{ notification_preferences: unknown }>(
      `SELECT notification_preferences FROM users WHERE id = $1 LIMIT 1;`,
      [input.userId]
    );
    if (!userRes.rows[0]) return;
    const prefs = normalizeNotificationPreferences(userRes.rows[0].notification_preferences);
    if (!prefs[input.eventKey]?.inApp) return;

    await this.pool.query(
      `INSERT INTO user_notifications (user_id, organization_id, event_key, title, message, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        input.userId,
        input.organizationId,
        input.eventKey,
        input.title,
        input.message,
        input.entityType || null,
        input.entityId || null
      ]
    );
  }

  async notifyProjectMembers(input: {
    projectId: string;
    organizationId: string;
    eventKey: NotificationEventKey;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
    excludeUserId?: string;
  }): Promise<void> {
    const members = await this.pool.query<{ user_id: string }>(
      `SELECT user_id FROM project_memberships WHERE project_id = $1;`,
      [input.projectId]
    );
    for (const row of members.rows) {
      if (input.excludeUserId && row.user_id === input.excludeUserId) continue;
      await this.createInAppNotification({
        userId: row.user_id,
        organizationId: input.organizationId,
        eventKey: input.eventKey,
        title: input.title,
        message: input.message,
        entityType: input.entityType || 'lead',
        entityId: input.entityId || input.projectId
      }).catch(() => {});
    }
  }

  async listUserNotifications(userId: string, limit = 30): Promise<{ items: UserNotificationItem[]; unreadCount: number }> {
    const [listRes, countRes] = await Promise.all([
      this.pool.query(
        `SELECT id, event_key, title, message, entity_type, entity_id, is_read, created_at
         FROM user_notifications
         WHERE user_id = $1
         ORDER BY created_at DESC LIMIT $2;`,
        [userId, limit]
      ),
      this.pool.query<{ unread: string }>(
        `SELECT COUNT(*)::text AS unread FROM user_notifications WHERE user_id = $1 AND is_read = FALSE;`,
        [userId]
      )
    ]);

    return {
      items: listRes.rows.map(r => ({
        id: r.id,
        eventKey: r.event_key,
        title: r.title,
        message: r.message,
        entityType: r.entity_type,
        entityId: r.entity_id,
        isRead: Boolean(r.is_read),
        createdAt: new Date(r.created_at).toISOString()
      })),
      unreadCount: Number.parseInt(countRes.rows[0]?.unread || '0', 10)
    };
  }

  async markNotificationsRead(userId: string, notificationIds?: string[]): Promise<void> {
    if (notificationIds && notificationIds.length > 0) {
      await this.pool.query(
        `UPDATE user_notifications SET is_read = TRUE WHERE user_id = $1 AND id = ANY($2::uuid[]);`,
        [userId, notificationIds]
      );
    } else {
      await this.pool.query(
        `UPDATE user_notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE;`,
        [userId]
      );
    }
  }

  // ============================================================================
  // 2. PROJECT / LEAD WORKSPACE SETTINGS (PBAC ENFORCED)
  // ============================================================================

  async resolveCallerProjectRole(leadId: string, userId: string): Promise<UserRole | null> {
    const memRes = await this.pool.query<{ project_role: string }>(
      `SELECT project_role FROM project_memberships WHERE project_id = $1 AND user_id = $2 LIMIT 1;`,
      [leadId, userId]
    );
    if (memRes.rows[0]?.project_role) {
      return toUserRole(memRes.rows[0].project_role);
    }

    const leadRes = await this.pool.query<{ created_by: string | null; assigned_to: string | null }>(
      `SELECT created_by, assigned_to FROM leads WHERE id = $1 LIMIT 1;`,
      [leadId]
    );
    const lead = leadRes.rows[0];
    if (lead && (lead.created_by === userId || lead.assigned_to === userId)) {
      await this.pool.query(
        `INSERT INTO project_memberships (project_id, user_id, project_role)
         VALUES ($1, $2, 'PRESALE_LEAD')
         ON CONFLICT (project_id, user_id) DO NOTHING;`,
        [leadId, userId]
      ).catch(() => {});
      return 'PRESALE_LEAD';
    }
    return null;
  }

  async getProjectSettingsBundle(leadId: string, organizationId: string) {
    const leadRes = await this.pool.query(
      `SELECT id, title, status, client_name, industry, description, is_archived, archive_outcome, archived_at,
              project_settings, extracted_metadata, created_at, updated_at
       FROM leads
       WHERE id = $1 AND organization_id = $2 LIMIT 1;`,
      [leadId, organizationId]
    );
    const lead = leadRes.rows[0];
    if (!lead) throw new NotFoundError('Dự án / Lead không tồn tại.');

    const [membersRes, invitesRes] = await Promise.all([
      this.pool.query(
        `SELECT pm.id, pm.user_id AS "userId", pm.project_role AS "projectRole",
                u.email, u.full_name AS "fullName", u.avatar_url AS "avatarUrl", u.job_title AS "jobTitle",
                pm.created_at AS "createdAt"
         FROM project_memberships pm
         JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = $1
         ORDER BY (CASE WHEN pm.project_role = 'PRESALE_LEAD' THEN 0 ELSE 1 END), pm.created_at ASC;`,
        [leadId]
      ),
      this.pool.query(
        `SELECT pi.id, pi.project_id AS "projectId", pi.email, pi.invited_user_id AS "invitedUserId",
                u.full_name AS "invitedUserName", pi.project_role AS "projectRole",
                pi.status, pi.last_sent_at AS "lastSentAt", pi.created_at AS "createdAt"
         FROM project_invitations pi
         LEFT JOIN users u ON u.id = pi.invited_user_id
         WHERE pi.project_id = $1
         ORDER BY pi.created_at DESC LIMIT 50;`,
        [leadId]
      )
    ]);

    const settings = normalizeProjectSettings(lead.project_settings, true);
    const meta = lead.extracted_metadata && typeof lead.extracted_metadata === 'object' ? lead.extracted_metadata : {};

    return {
      general: {
        id: lead.id,
        title: lead.title,
        status: lead.status,
        clientName: lead.client_name || meta.clientName || meta.companyName || '',
        industry: lead.industry || meta.clientIndustry || meta.industry || '',
        description: lead.description || '',
        isArchived: Boolean(lead.is_archived),
        archiveOutcome: lead.archive_outcome || null,
        archivedAt: lead.archived_at ? new Date(lead.archived_at).toISOString() : null,
        createdAt: new Date(lead.created_at).toISOString(),
        updatedAt: new Date(lead.updated_at).toISOString()
      },
      settings,
      members: membersRes.rows.map(m => ({
        ...m,
        projectRole: toUserRole(m.projectRole),
        createdAt: new Date(m.createdAt).toISOString()
      })),
      invitations: invitesRes.rows.map(i => ({
        ...i,
        projectRole: toUserRole(i.projectRole),
        lastSentAt: new Date(i.lastSentAt).toISOString(),
        createdAt: new Date(i.createdAt).toISOString()
      })) as ProjectInvitationItem[]
    };
  }

  async getRawProjectSettings(leadId: string, organizationId?: string): Promise<ProjectSettingsPayload> {
    const res = organizationId
      ? await this.pool.query(`SELECT project_settings FROM leads WHERE id = $1 AND organization_id = $2 LIMIT 1;`, [leadId, organizationId])
      : await this.pool.query(`SELECT project_settings FROM leads WHERE id = $1 LIMIT 1;`, [leadId]);
    if (!res.rows[0]) return normalizeProjectSettings({}, false);
    return normalizeProjectSettings(res.rows[0].project_settings, false);
  }

  async updateProjectSettingsSection<K extends keyof ProjectSettingsPayload>(
    leadId: string,
    organizationId: string,
    section: K,
    nextValue: ProjectSettingsPayload[K]
  ): Promise<ProjectSettingsPayload> {
    const res = await this.pool.query<{ project_settings: unknown }>(
      `SELECT project_settings FROM leads WHERE id = $1 AND organization_id = $2 LIMIT 1;`,
      [leadId, organizationId]
    );
    if (!res.rows[0]) throw new NotFoundError('Dự án / Lead không tồn tại.');
    const existing = normalizeProjectSettings(res.rows[0].project_settings, false);
    const merged: ProjectSettingsPayload = {
      ...existing,
      [section]: nextValue
    };
    await this.pool.query(
      `UPDATE leads SET project_settings = $1::jsonb, updated_at = NOW() WHERE id = $2 AND organization_id = $3;`,
      [JSON.stringify(merged), leadId, organizationId]
    );
    return normalizeProjectSettings(merged, true);
  }

  async updateProjectGeneral(
    leadId: string,
    organizationId: string,
    input: {
      title?: string;
      clientName?: string;
      industry?: string;
      description?: string;
      isArchived?: boolean;
      archiveOutcome?: string | null;
    }
  ) {
    const res = await this.pool.query(
      `UPDATE leads
       SET title = COALESCE($1, title),
           client_name = COALESCE($2, client_name),
           industry = COALESCE($3, industry),
           description = COALESCE($4, description),
           is_archived = COALESCE($5, is_archived),
           archive_outcome = CASE WHEN $6::boolean THEN $7 ELSE archive_outcome END,
           archived_at = CASE
             WHEN $5::boolean IS TRUE AND archived_at IS NULL THEN NOW()
             WHEN $5::boolean IS FALSE THEN NULL
             ELSE archived_at
           END,
           updated_at = NOW()
       WHERE id = $8 AND organization_id = $9
       RETURNING id, title, status, client_name, industry, description, is_archived, archive_outcome, archived_at;`,
      [
        input.title ?? null,
        input.clientName ?? null,
        input.industry ?? null,
        input.description ?? null,
        input.isArchived ?? null,
        input.archiveOutcome !== undefined,
        input.archiveOutcome ?? null,
        leadId,
        organizationId
      ]
    );
    if (!res.rows[0]) throw new NotFoundError('Dự án / Lead không tồn tại.');
    const r = res.rows[0];
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      clientName: r.client_name || '',
      industry: r.industry || '',
      description: r.description || '',
      isArchived: Boolean(r.is_archived),
      archiveOutcome: r.archive_outcome || null,
      archivedAt: r.archived_at ? new Date(r.archived_at).toISOString() : null
    };
  }

  async deleteProject(leadId: string, organizationId: string, confirmTitle: string): Promise<{ deletedTitle: string }> {
    const check = await this.pool.query<{ id: string; title: string }>(
      `SELECT id, title FROM leads WHERE id = $1 AND organization_id = $2 LIMIT 1;`,
      [leadId, organizationId]
    );
    if (!check.rows[0]) throw new NotFoundError('Dự án / Lead không tồn tại.');
    if (check.rows[0].title.trim() !== confirmTitle.trim()) {
      throw new ValidationError('Tên dự án xác nhận không khớp chính xác. Vui lòng nhập đúng tên dự án để xóa.');
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM proposals WHERE lead_id = $1 AND organization_id = $2;`, [leadId, organizationId]);
      await client.query(`DELETE FROM leads WHERE id = $1 AND organization_id = $2;`, [leadId, organizationId]);
      await client.query('COMMIT');
      return { deletedTitle: check.rows[0].title };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createProjectInvitation(input: {
    projectId: string;
    organizationId: string;
    identifier: string; // Email or fullName/username within organization
    projectRole: UserRole;
    invitedBy: string;
  }): Promise<ProjectInvitationItem> {
    const trimmed = input.identifier.trim();
    const userRes = await this.pool.query<{ id: string; email: string; full_name: string; organization_id: string | null }>(
      `SELECT id, email, full_name, organization_id
       FROM users
       WHERE lower(email) = lower($1)
          OR (organization_id = $2 AND lower(full_name) = lower($1))
       LIMIT 1;`,
      [trimmed, input.organizationId]
    );

    const matchedUser = userRes.rows[0] || null;
    const targetEmail = matchedUser ? matchedUser.email : trimmed.toLowerCase();
    if (!matchedUser && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      throw new NotFoundError(`Không tìm thấy thành viên "${trimmed}" trong tổ chức. Vui lòng nhập email hợp lệ để gửi lời mời.`);
    }

    if (matchedUser) {
      const existingMember = await this.pool.query(
        `SELECT 1 FROM project_memberships WHERE project_id = $1 AND user_id = $2;`,
        [input.projectId, matchedUser.id]
      );
      if (existingMember.rows.length > 0) {
        throw new ConflictError(`Thành viên ${matchedUser.email} đã tham gia dự án này.`);
      }
    }

    const existingInvite = await this.pool.query(
      `SELECT id FROM project_invitations WHERE project_id = $1 AND lower(email) = lower($2) AND status = 'PENDING';`,
      [input.projectId, targetEmail]
    );
    if (existingInvite.rows.length > 0) {
      throw new ConflictError(`Đã có lời mời đang chờ xác nhận gửi tới ${targetEmail}.`);
    }

    const ins = await this.pool.query(
      `INSERT INTO project_invitations (project_id, organization_id, email, invited_user_id, project_role, invited_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
       RETURNING id, project_id AS "projectId", email, invited_user_id AS "invitedUserId",
                 project_role AS "projectRole", status, last_sent_at AS "lastSentAt", created_at AS "createdAt";`,
      [input.projectId, input.organizationId, targetEmail, matchedUser?.id || null, input.projectRole, input.invitedBy]
    );

    const row = ins.rows[0];
    if (matchedUser) {
      const leadRes = await this.pool.query<{ title: string }>(`SELECT title FROM leads WHERE id = $1`, [input.projectId]);
      const projectTitle = leadRes.rows[0]?.title || 'Dự án mới';
      await this.createInAppNotification({
        userId: matchedUser.id,
        organizationId: input.organizationId,
        eventKey: 'project_invited',
        title: 'Lời mời tham gia dự án mới',
        message: `Bạn được mời tham gia dự án "${projectTitle}" với vai trò ${input.projectRole}.`,
        entityType: 'lead',
        entityId: input.projectId
      }).catch(() => {});
    }

    return {
      ...row,
      invitedUserName: matchedUser?.full_name || null,
      projectRole: toUserRole(row.projectRole),
      lastSentAt: new Date(row.lastSentAt).toISOString(),
      createdAt: new Date(row.createdAt).toISOString()
    };
  }

  async resendProjectInvitation(projectId: string, invitationId: string): Promise<ProjectInvitationItem> {
    const res = await this.pool.query(
      `UPDATE project_invitations
       SET last_sent_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND project_id = $2 AND status = 'PENDING'
       RETURNING id, project_id AS "projectId", email, invited_user_id AS "invitedUserId",
                 project_role AS "projectRole", status, last_sent_at AS "lastSentAt", created_at AS "createdAt";`,
      [invitationId, projectId]
    );
    if (!res.rows[0]) throw new NotFoundError('Không tìm thấy lời mời đang chờ.');
    const r = res.rows[0];
    return {
      ...r,
      projectRole: toUserRole(r.projectRole),
      lastSentAt: new Date(r.lastSentAt).toISOString(),
      createdAt: new Date(r.createdAt).toISOString()
    };
  }

  async revokeProjectInvitation(projectId: string, invitationId: string): Promise<void> {
    const res = await this.pool.query(
      `UPDATE project_invitations
       SET status = 'REVOKED', updated_at = NOW()
       WHERE id = $1 AND project_id = $2 AND status = 'PENDING';`,
      [invitationId, projectId]
    );
    if ((res.rowCount ?? 0) === 0) throw new NotFoundError('Không tìm thấy lời mời đang chờ.');
  }

  async listMyPendingInvitations(userId: string, email: string) {
    const res = await this.pool.query(
      `SELECT pi.id, pi.project_id AS "projectId", l.title AS "projectTitle",
              pi.project_role AS "projectRole", pi.status, pi.last_sent_at AS "lastSentAt",
              u.full_name AS "invitedByName"
       FROM project_invitations pi
       JOIN leads l ON l.id = pi.project_id
       LEFT JOIN users u ON u.id = pi.invited_by
       WHERE pi.status = 'PENDING' AND (pi.invited_user_id = $1 OR lower(pi.email) = lower($2))
       ORDER BY pi.created_at DESC;`,
      [userId, email]
    );
    return res.rows.map(r => ({
      ...r,
      projectRole: toUserRole(r.projectRole),
      lastSentAt: new Date(r.lastSentAt).toISOString()
    }));
  }

  async acceptProjectInvitation(invitationId: string, userId: string, email: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const invRes = await client.query(
        `SELECT id, project_id, organization_id, project_role, invited_user_id, email
         FROM project_invitations
         WHERE id = $1 AND status = 'PENDING'
           AND (invited_user_id = $2 OR lower(email) = lower($3))
         FOR UPDATE;`,
        [invitationId, userId, email]
      );
      const inv = invRes.rows[0];
      if (!inv) throw new NotFoundError('Lời mời không tồn tại hoặc đã hết hiệu lực.');

      await client.query(
        `UPDATE users SET organization_id = COALESCE(organization_id, $1) WHERE id = $2;`,
        [inv.organization_id, userId]
      );

      await client.query(
        `INSERT INTO project_memberships (project_id, user_id, project_role)
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id, user_id) DO UPDATE SET project_role = EXCLUDED.project_role, updated_at = NOW();`,
        [inv.project_id, userId, inv.project_role]
      );

      await client.query(
        `UPDATE users SET role = $1 WHERE id = $2 AND role = 'VIEWER';`,
        [inv.project_role, userId]
      );

      await client.query(
        `UPDATE project_invitations SET status = 'ACCEPTED', invited_user_id = $1, updated_at = NOW() WHERE id = $2;`,
        [userId, invitationId]
      );

      await client.query('COMMIT');
      return { projectId: inv.project_id, projectRole: toUserRole(inv.project_role) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async transferLeadOwnership(
    leadId: string,
    organizationId: string,
    currentLeadUserId: string,
    targetUserId: string
  ): Promise<void> {
    if (currentLeadUserId === targetUserId) {
      throw new ValidationError('Bạn hiện đã là Presale Lead của dự án này.');
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const targetCheck = await client.query(
        `SELECT project_role FROM project_memberships WHERE project_id = $1 AND user_id = $2 FOR UPDATE;`,
        [leadId, targetUserId]
      );
      if (targetCheck.rows.length === 0) {
        throw new NotFoundError('Thành viên được chọn phải nằm trong danh sách nhân sự của dự án trước khi chuyển giao quyền Lead.');
      }

      await client.query(
        `UPDATE project_memberships SET project_role = 'PRESALE_LEAD', updated_at = NOW()
         WHERE project_id = $1 AND user_id = $2;`,
        [leadId, targetUserId]
      );
      await client.query(
        `UPDATE project_memberships SET project_role = 'PRESALE_CONSULTANT', updated_at = NOW()
         WHERE project_id = $1 AND user_id = $2;`,
        [leadId, currentLeadUserId]
      );
      await client.query(
        `UPDATE leads SET assigned_to = $1, updated_at = NOW()
         WHERE id = $2 AND organization_id = $3;`,
        [targetUserId, leadId, organizationId]
      );
      await client.query(
        `UPDATE users SET role = 'PRESALE_LEAD' WHERE id = $1 AND role <> 'ADMIN';`,
        [targetUserId]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // 3. SYSTEM SETTINGS (SYSTEM ADMIN ONLY)
  // ============================================================================

  async getSecurityPolicy(): Promise<SystemSecurityPolicy> {
    const res = await this.pool.query<{ value: unknown }>(
      `SELECT value FROM system_settings WHERE key = 'security_policy' LIMIT 1;`
    );
    const val = res.rows[0]?.value && typeof res.rows[0].value === 'object'
      ? (res.rows[0].value as Record<string, any>)
      : {};
    return {
      minPasswordLength:
        typeof val.minPasswordLength === 'number' ? val.minPasswordLength : DEFAULT_SYSTEM_SECURITY_POLICY.minPasswordLength,
      sessionTimeoutMinutes:
        typeof val.sessionTimeoutMinutes === 'number' ? val.sessionTimeoutMinutes : DEFAULT_SYSTEM_SECURITY_POLICY.sessionTimeoutMinutes,
      maxFailedLoginAttempts:
        typeof val.maxFailedLoginAttempts === 'number' ? val.maxFailedLoginAttempts : DEFAULT_SYSTEM_SECURITY_POLICY.maxFailedLoginAttempts,
      lockoutDurationMinutes:
        typeof val.lockoutDurationMinutes === 'number' ? val.lockoutDurationMinutes : DEFAULT_SYSTEM_SECURITY_POLICY.lockoutDurationMinutes
    };
  }

  async updateSecurityPolicy(policy: SystemSecurityPolicy, adminId: string): Promise<SystemSecurityPolicy> {
    await this.pool.query(
      `INSERT INTO system_settings (key, value, updated_by, updated_at)
       VALUES ('security_policy', $1::jsonb, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW();`,
      [JSON.stringify(policy), adminId]
    );
    return policy;
  }

  async getAIConfig(includeSecret = false): Promise<SystemAIConfig> {
    const res = await this.pool.query<{ value: unknown }>(
      `SELECT value FROM system_settings WHERE key = 'ai_config' LIMIT 1;`
    );
    const val = res.rows[0]?.value && typeof res.rows[0].value === 'object'
      ? (res.rows[0].value as Record<string, any>)
      : {};
    const customApiKey = typeof val.customApiKey === 'string' && val.customApiKey.trim() ? val.customApiKey.trim() : undefined;
    const provider = ['GEMINI', 'OPENAI', 'ANTHROPIC'].includes(val.activeProvider)
      ? val.activeProvider
      : DEFAULT_SYSTEM_AI_CONFIG.activeProvider;

    return {
      activeProvider: provider,
      defaultModel: typeof val.defaultModel === 'string' && val.defaultModel.trim()
        ? val.defaultModel.trim()
        : DEFAULT_SYSTEM_AI_CONFIG.defaultModel,
      fallbackEnabled: typeof val.fallbackEnabled === 'boolean' ? val.fallbackEnabled : DEFAULT_SYSTEM_AI_CONFIG.fallbackEnabled,
      hasCustomApiKey: Boolean(customApiKey),
      maskedApiKey: maskApiKey(customApiKey),
      ...(includeSecret && customApiKey ? { customApiKey } : {}),
      requestsPerMinute: typeof val.requestsPerMinute === 'number' ? val.requestsPerMinute : DEFAULT_SYSTEM_AI_CONFIG.requestsPerMinute,
      dailyTokenQuota: typeof val.dailyTokenQuota === 'number' ? val.dailyTokenQuota : DEFAULT_SYSTEM_AI_CONFIG.dailyTokenQuota,
      maxProposalsPerDay: typeof val.maxProposalsPerDay === 'number' ? val.maxProposalsPerDay : DEFAULT_SYSTEM_AI_CONFIG.maxProposalsPerDay
    };
  }

  async updateAIConfig(input: Partial<SystemAIConfig> & { clearCustomApiKey?: boolean }, adminId: string): Promise<SystemAIConfig> {
    const current = await this.getAIConfig(true);
    let nextKey = current.customApiKey;
    if (input.clearCustomApiKey) {
      nextKey = undefined;
    } else if (typeof input.customApiKey === 'string' && input.customApiKey.trim()) {
      nextKey = input.customApiKey.trim();
    }

    const stored = {
      activeProvider: input.activeProvider || current.activeProvider,
      defaultModel: input.defaultModel || current.defaultModel,
      fallbackEnabled: typeof input.fallbackEnabled === 'boolean' ? input.fallbackEnabled : current.fallbackEnabled,
      customApiKey: nextKey || null,
      requestsPerMinute: typeof input.requestsPerMinute === 'number' ? input.requestsPerMinute : current.requestsPerMinute,
      dailyTokenQuota: typeof input.dailyTokenQuota === 'number' ? input.dailyTokenQuota : current.dailyTokenQuota,
      maxProposalsPerDay: typeof input.maxProposalsPerDay === 'number' ? input.maxProposalsPerDay : current.maxProposalsPerDay
    };

    await this.pool.query(
      `INSERT INTO system_settings (key, value, updated_by, updated_at)
       VALUES ('ai_config', $1::jsonb, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW();`,
      [JSON.stringify(stored), adminId]
    );
    return this.getAIConfig(false);
  }

  async listGlobalUsers(query: { search?: string; role?: string; status?: string; page: number; limit: number }) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.search) {
      params.push(`%${query.search}%`);
      conditions.push(`(u.email ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`);
    }
    if (query.role && (USER_ROLES as readonly string[]).includes(query.role)) {
      params.push(query.role);
      conditions.push(`u.role = $${params.length}`);
    }
    if (query.status) {
      params.push(query.status);
      conditions.push(`u.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (query.page - 1) * query.limit;

    const countRes = await this.pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM users u ${whereClause};`,
      params
    );
    const total = Number.parseInt(countRes.rows[0]?.total || '0', 10);

    const rowsRes = await this.pool.query(
      `SELECT u.id, u.email, u.full_name AS "fullName", u.role, u.status, u.organization_id AS "organizationId",
              o.name AS "organizationName", u.two_factor_enabled AS "twoFactorEnabled",
              u.failed_login_attempts AS "failedLoginAttempts", u.locked_until AS "lockedUntil",
              u.created_at AS "createdAt"
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2};`,
      [...params, query.limit, offset]
    );

    return {
      users: rowsRes.rows.map(r => ({
        ...r,
        role: toUserRole(r.role),
        status: toUserStatus(r.status),
        lockedUntil: r.lockedUntil ? new Date(r.lockedUntil).toISOString() : null,
        createdAt: new Date(r.createdAt).toISOString()
      })),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1
    };
  }

  async setUserGlobalStatus(targetUserId: string, status: UserStatus, adminId: string): Promise<void> {
    if (targetUserId === adminId && status !== 'ACTIVE') {
      throw new ValidationError('Không thể tự khóa tài khoản Quản trị viên đang đăng nhập.');
    }
    const res = await this.pool.query(
      `UPDATE users
       SET status = $1,
           failed_login_attempts = CASE WHEN $1 = 'ACTIVE' THEN 0 ELSE failed_login_attempts END,
           locked_until = CASE WHEN $1 = 'ACTIVE' THEN NULL ELSE locked_until END,
           updated_at = NOW()
       WHERE id = $2;`,
      [status, targetUserId]
    );
    if ((res.rowCount ?? 0) === 0) throw new NotFoundError('User not found.');
    if (status !== 'ACTIVE') {
      await this.pool.query(`UPDATE auth_refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL;`, [targetUserId]);
    }
  }

  async createEmergencyPasswordReset(targetUserId: string, frontendUrl: string, ttlMinutes: number) {
    const uRes = await this.pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE id = $1 LIMIT 1;`,
      [targetUserId]
    );
    if (!uRes.rows[0]) throw new NotFoundError('User not found.');
    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    await this.pool.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1;`,
      [targetUserId]
    );
    await this.pool.query(
      `INSERT INTO auth_password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3);`,
      [targetUserId, hashToken(token), expiresAt]
    );
    return {
      email: uRes.rows[0].email,
      expiresAt: expiresAt.toISOString(),
      resetUrl: `${frontendUrl.replace(/\/$/, '')}/#reset-password?token=${encodeURIComponent(token)}`
    };
  }

  async listSystemSecurityAuditLogs(query: { action?: string; page: number; limit: number }) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.action) {
      params.push(`%${query.action}%`);
      conditions.push(`a.action ILIKE $${params.length}`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (query.page - 1) * query.limit;

    const countRes = await this.pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM audit_logs a ${whereClause};`,
      params
    );
    const total = Number.parseInt(countRes.rows[0]?.total || '0', 10);

    const rowsRes = await this.pool.query(
      `SELECT a.id, a.organization_id AS "organizationId", o.name AS "organizationName",
              a.user_id AS "actorId", u.email AS "actorEmail",
              a.action, a.entity_type AS "entityType", a.entity_id AS "entityId",
              a.payload, a.result_status AS "resultStatus", a.ip_address AS "ipAddress",
              a.created_at AS "createdAt"
       FROM audit_logs a
       LEFT JOIN organizations o ON o.id = a.organization_id
       LEFT JOIN users u ON u.id = a.user_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2};`,
      [...params, query.limit, offset]
    );

    return {
      logs: rowsRes.rows.map(r => ({
        ...r,
        payload: sanitizeAuditPayload(r.payload),
        createdAt: new Date(r.createdAt).toISOString()
      })),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1
    };
  }
}
