import { apiRequest, apiRequestWithMeta } from './apiClient';
import type { UserRole, UserStatus } from '../types/auth';
import type {
  AccountSettingsBundle,
  ExternalIntegrations,
  NotificationPreferences,
  ProjectAIInstructions,
  ProjectCommercialConfig,
  ProjectInvitationItem,
  ProjectPortalConfig,
  ProjectQualificationRules,
  ProjectSettingsBundle,
  SystemAIConfig,
  SystemAuditLogEntry,
  SystemSecurityPolicy,
  GlobalSystemUser
} from '../types/settings';

const SETTINGS_PREFIX = '/api/v1/settings';

export const settingsService = {
  // 1. Account Settings
  getAccountSettings: () => apiRequest<AccountSettingsBundle>(`${SETTINGS_PREFIX}/account`),

  updateAccountProfile: (payload: {
    fullName?: string;
    avatarUrl?: string | null;
    jobTitle?: string;
    phone?: string;
    displaySignature?: string;
  }) => apiRequest<any>(`${SETTINGS_PREFIX}/account/profile`, { method: 'PATCH', body: payload }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ message: string }>(`${SETTINGS_PREFIX}/account/password`, {
      method: 'POST',
      body: { currentPassword, newPassword }
    }),

  revokeOtherSessions: () =>
    apiRequest<{ revokedCount: number }>(`${SETTINGS_PREFIX}/account/sessions/others`, { method: 'DELETE' }),

  revokeSession: (sessionId: string) =>
    apiRequest<{ revoked: boolean }>(`${SETTINGS_PREFIX}/account/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    }),

  setupTwoFactor: () =>
    apiRequest<{ secret: string; otpauthUrl: string }>(`${SETTINGS_PREFIX}/account/2fa/setup`, { method: 'POST' }),

  enableTwoFactor: (code: string) =>
    apiRequest<{ twoFactorEnabled: boolean }>(`${SETTINGS_PREFIX}/account/2fa/enable`, {
      method: 'POST',
      body: { code }
    }),

  disableTwoFactor: (password: string) =>
    apiRequest<{ twoFactorEnabled: boolean }>(`${SETTINGS_PREFIX}/account/2fa/disable`, {
      method: 'POST',
      body: { password }
    }),

  updateNotifications: (prefs: NotificationPreferences) =>
    apiRequest<NotificationPreferences>(`${SETTINGS_PREFIX}/account/notifications`, {
      method: 'PATCH',
      body: prefs
    }),

  markNotificationsRead: (ids?: string[]) =>
    apiRequest<{ ok: boolean }>(`${SETTINGS_PREFIX}/account/notifications/read`, {
      method: 'POST',
      body: { ids }
    }),

  updateIntegrations: (integrations: ExternalIntegrations) =>
    apiRequest<ExternalIntegrations>(`${SETTINGS_PREFIX}/account/integrations`, {
      method: 'PATCH',
      body: integrations
    }),

  acceptInvitation: (invitationId: string) =>
    apiRequest<{ projectId: string; projectRole: UserRole }>(
      `${SETTINGS_PREFIX}/account/invitations/${encodeURIComponent(invitationId)}/accept`,
      { method: 'POST' }
    ),

  // 2. Project Settings
  getProjectSettings: (leadId: string) =>
    apiRequest<ProjectSettingsBundle>(`${SETTINGS_PREFIX}/projects/${encodeURIComponent(leadId)}`),

  updateQualification: (leadId: string, rules: ProjectQualificationRules) =>
    apiRequest<ProjectQualificationRules>(`${SETTINGS_PREFIX}/projects/${encodeURIComponent(leadId)}/qualification`, {
      method: 'PATCH',
      body: rules
    }),

  updateAIInstructions: (leadId: string, instructions: ProjectAIInstructions) =>
    apiRequest<ProjectAIInstructions>(`${SETTINGS_PREFIX}/projects/${encodeURIComponent(leadId)}/ai-instructions`, {
      method: 'PATCH',
      body: instructions
    }),

  updateCommercial: (leadId: string, commercial: ProjectCommercialConfig) =>
    apiRequest<ProjectCommercialConfig>(`${SETTINGS_PREFIX}/projects/${encodeURIComponent(leadId)}/commercial`, {
      method: 'PATCH',
      body: commercial
    }),

  updatePortalConfig: (leadId: string, config: ProjectPortalConfig) =>
    apiRequest<ProjectPortalConfig>(`${SETTINGS_PREFIX}/projects/${encodeURIComponent(leadId)}/portal`, {
      method: 'PATCH',
      body: config
    }),

  updateProjectGeneral: (
    leadId: string,
    payload: {
      title?: string;
      clientName?: string;
      industry?: string;
      description?: string;
      isArchived?: boolean;
      archiveOutcome?: string | null;
    }
  ) =>
    apiRequest<ProjectSettingsBundle['general']>(`${SETTINGS_PREFIX}/projects/${encodeURIComponent(leadId)}/general`, {
      method: 'PATCH',
      body: payload
    }),

  deleteProject: (leadId: string, confirmTitle: string) =>
    apiRequest<{ deletedTitle: string }>(`${SETTINGS_PREFIX}/projects/${encodeURIComponent(leadId)}`, {
      method: 'DELETE',
      body: { confirmTitle }
    }),

  createInvitation: (leadId: string, identifier: string, projectRole: UserRole) =>
    apiRequest<ProjectInvitationItem>(`${SETTINGS_PREFIX}/projects/${encodeURIComponent(leadId)}/invitations`, {
      method: 'POST',
      body: { identifier, projectRole }
    }),

  resendInvitation: (leadId: string, invitationId: string) =>
    apiRequest<ProjectInvitationItem>(
      `${SETTINGS_PREFIX}/projects/${encodeURIComponent(leadId)}/invitations/${encodeURIComponent(invitationId)}/resend`,
      { method: 'POST' }
    ),

  revokeInvitation: (leadId: string, invitationId: string) =>
    apiRequest<{ revoked: boolean }>(
      `${SETTINGS_PREFIX}/projects/${encodeURIComponent(leadId)}/invitations/${encodeURIComponent(invitationId)}`,
      { method: 'DELETE' }
    ),

  transferLeadOwnership: (leadId: string, targetUserId: string) =>
    apiRequest<{ transferredTo: string }>(
      `${SETTINGS_PREFIX}/projects/${encodeURIComponent(leadId)}/transfer-ownership`,
      { method: 'POST', body: { targetUserId } }
    ),

  // 3. System Settings (SYSTEM_ADMIN only)
  getSystemSettings: () =>
    apiRequest<{ securityPolicy: SystemSecurityPolicy; aiConfig: SystemAIConfig }>(`${SETTINGS_PREFIX}/system`),

  updateSecurityPolicy: (policy: SystemSecurityPolicy) =>
    apiRequest<SystemSecurityPolicy>(`${SETTINGS_PREFIX}/system/security-policy`, {
      method: 'PATCH',
      body: policy
    }),

  updateAIConfig: (payload: Partial<SystemAIConfig> & { customApiKey?: string; clearCustomApiKey?: boolean }) =>
    apiRequest<SystemAIConfig>(`${SETTINGS_PREFIX}/system/ai-config`, {
      method: 'PATCH',
      body: payload
    }),

  listGlobalUsers: async (query: { search?: string; role?: string; status?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.role) params.set('role', query.role);
    if (query.status) params.set('status', query.status);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    const res = await apiRequestWithMeta<GlobalSystemUser[]>(`${SETTINGS_PREFIX}/system/users?${params.toString()}`);
    return { users: res.data ?? [], meta: res.meta };
  },

  updateGlobalUserStatus: (userId: string, status: UserStatus) =>
    apiRequest<{ userId: string; status: UserStatus }>(`${SETTINGS_PREFIX}/system/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      body: { status }
    }),

  emergencyResetPassword: (userId: string) =>
    apiRequest<{ email: string; expiresAt: string; resetUrl: string }>(
      `${SETTINGS_PREFIX}/system/users/${encodeURIComponent(userId)}/emergency-reset`,
      { method: 'POST' }
    ),

  listSystemAuditLogs: async (query: { action?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (query.action) params.set('action', query.action);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    const res = await apiRequestWithMeta<SystemAuditLogEntry[]>(`${SETTINGS_PREFIX}/system/audit-logs?${params.toString()}`);
    return { logs: res.data ?? [], meta: res.meta };
  }
};
