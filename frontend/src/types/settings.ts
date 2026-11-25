import type { UserRole, UserStatus } from './auth';

export type AccessLevel = 'F' | 'V' | 'NO';

export interface NotificationChannelConfig {
  email: boolean;
  inApp: boolean;
}

export type NotificationEventKey =
  | 'project_invited'
  | 'project_role_changed'
  | 'proposal_in_review'
  | 'proposal_reviewed'
  | 'client_portal_opened'
  | 'client_comment_created'
  | 'client_ai_interaction';

export type NotificationPreferences = Record<NotificationEventKey, NotificationChannelConfig>;

export interface MeetingIntegrationStatus {
  connected: boolean;
  accountEmail: string;
  autoExtractTranscript: boolean;
  connectedAt: string | null;
}

export interface FigmaIntegrationStatus {
  connected: boolean;
  workspaceName: string;
  accountHandle: string;
  syncDesignBriefToWireframe: boolean;
  connectedAt: string | null;
}

export interface ExternalIntegrations {
  googleMeet: MeetingIntegrationStatus;
  zoom: MeetingIntegrationStatus;
  microsoftTeams: MeetingIntegrationStatus;
  figma: FigmaIntegrationStatus;
}

export interface ActiveAuthSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface UserNotificationItem {
  id: string;
  eventKey: NotificationEventKey | string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface MyPendingInvitation {
  id: string;
  projectId: string;
  projectTitle: string;
  projectRole: UserRole;
  status: string;
  lastSentAt: string;
  invitedByName: string | null;
}

export interface AccountSettingsBundle {
  profile: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    role: UserRole;
    jobTitle: string;
    phone: string;
    displaySignature: string;
  };
  security: {
    twoFactorEnabled: boolean;
    activeSessions: ActiveAuthSession[];
  };
  notifications: NotificationPreferences;
  integrations: ExternalIntegrations;
  notificationFeed: UserNotificationItem[];
  unreadNotificationCount: number;
  pendingInvitations: MyPendingInvitation[];
}

export interface ProjectQualificationRules {
  budgetWeight: number;
  authorityWeight: number;
  needWeight: number;
  timelineWeight: number;
  autoApproveThreshold: number;
  autoRejectThreshold: number;
  intakeQuestions: string[];
}

export type ProjectToneOfVoice = 'PROFESSIONAL' | 'TECHNICAL_DEEP_DIVE' | 'EXECUTIVE_PITCH';

export interface ProjectAIInstructions {
  defaultLanguage: string;
  toneOfVoice: ProjectToneOfVoice;
  customContextRules: string[];
}

export interface ProjectCommercialConfig {
  defaultCurrency: string;
  taxRatePercent: number;
  maxDiscountPercent: number;
  paymentTermsNote: string;
}

export interface ProjectPortalBranding {
  logoUrl: string;
  primaryColor: string;
  welcomeMessage: string;
}

export interface ProjectPortalConfig {
  isEnabled: boolean;
  passcodeEnabled: boolean;
  hasPasscode?: boolean;
  passcode?: string;
  allowedDomains: string[];
  defaultExpirationHours: number;
  aiAssistantEnabled: boolean;
  commentsEnabled: boolean;
  branding: ProjectPortalBranding;
}

export interface ProjectSettingsPermissions {
  members: AccessLevel;
  qualification: AccessLevel;
  rateCards: AccessLevel;
  aiInstructions: AccessLevel;
  portalConfig: AccessLevel;
  generalArchive: AccessLevel;
  deleteProject: AccessLevel;
}

export interface ProjectMemberEntry {
  id: string;
  userId: string;
  projectRole: UserRole;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  jobTitle?: string | null;
  createdAt: string;
}

export interface ProjectInvitationItem {
  id: string;
  projectId: string;
  email: string;
  invitedUserId: string | null;
  invitedUserName?: string | null;
  projectRole: UserRole;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
  lastSentAt: string;
  createdAt: string;
}

export interface ProjectSettingsBundle {
  general: {
    id: string;
    title: string;
    status: string;
    clientName: string;
    industry: string;
    description: string;
    isArchived: boolean;
    archiveOutcome: string | null;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  settings: {
    qualification: ProjectQualificationRules;
    aiInstructions: ProjectAIInstructions;
    commercial: ProjectCommercialConfig;
    portalConfig: ProjectPortalConfig;
  };
  members: ProjectMemberEntry[];
  invitations: ProjectInvitationItem[];
  callerProjectRole: UserRole;
  permissions: ProjectSettingsPermissions;
}

export interface SystemSecurityPolicy {
  minPasswordLength: number;
  sessionTimeoutMinutes: number;
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
}

export interface SystemAIConfig {
  activeProvider: 'GEMINI' | 'OPENAI' | 'ANTHROPIC';
  defaultModel: string;
  fallbackEnabled: boolean;
  hasCustomApiKey?: boolean;
  maskedApiKey?: string;
  requestsPerMinute: number;
  dailyTokenQuota: number;
  maxProposalsPerDay: number;
}

export interface GlobalSystemUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string | null;
  organizationName: string | null;
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
}

export interface SystemAuditLogEntry {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
  resultStatus: string;
  ipAddress: string | null;
  createdAt: string;
}
