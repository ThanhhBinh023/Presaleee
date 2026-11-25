import { UserRole } from './AuthUser.js';

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

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  project_invited: { email: true, inApp: true },
  project_role_changed: { email: true, inApp: true },
  proposal_in_review: { email: true, inApp: true },
  proposal_reviewed: { email: true, inApp: true },
  client_portal_opened: { email: false, inApp: true },
  client_comment_created: { email: true, inApp: true },
  client_ai_interaction: { email: false, inApp: true }
};

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

export const DEFAULT_EXTERNAL_INTEGRATIONS: ExternalIntegrations = {
  googleMeet: { connected: false, accountEmail: '', autoExtractTranscript: true, connectedAt: null },
  zoom: { connected: false, accountEmail: '', autoExtractTranscript: true, connectedAt: null },
  microsoftTeams: { connected: false, accountEmail: '', autoExtractTranscript: true, connectedAt: null },
  figma: { connected: false, workspaceName: '', accountHandle: '', syncDesignBriefToWireframe: true, connectedAt: null }
};

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

export interface AccountSettingsView {
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
  passcodeHash?: string | null;
  hasPasscode?: boolean;
  allowedDomains: string[];
  defaultExpirationHours: number;
  aiAssistantEnabled: boolean;
  commentsEnabled: boolean;
  branding: ProjectPortalBranding;
}

export interface ProjectSettingsPayload {
  qualification: ProjectQualificationRules;
  aiInstructions: ProjectAIInstructions;
  commercial: ProjectCommercialConfig;
  portalConfig: ProjectPortalConfig;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettingsPayload = {
  qualification: {
    budgetWeight: 30,
    authorityWeight: 20,
    needWeight: 30,
    timelineWeight: 20,
    autoApproveThreshold: 75,
    autoRejectThreshold: 40,
    intakeQuestions: [
      'Ngân sách dự kiến và cơ cấu phân bổ vốn của dự án là bao nhiêu?',
      'Ai là người phê duyệt cuối cùng về mặt kỹ thuật và ngân sách?',
      'Bài toán kinh doanh cấp bách nhất cần hệ thống giải quyết trong 6 tháng tới là gì?',
      'Mốc thời gian Go-live kỳ vọng và các ràng buộc tuân thủ/bảo mật bắt buộc?'
    ]
  },
  aiInstructions: {
    defaultLanguage: 'Tiếng Việt',
    toneOfVoice: 'PROFESSIONAL',
    customContextRules: [
      'Luôn nêu rõ tiêu chuẩn bảo mật, phân quyền dữ liệu và khả năng mở rộng hệ thống.',
      'Bám sát dữ liệu thực tế từ RFP và Discovery Meetings, không tự ý suy diễn cam kết ngoài phạm vi.'
    ]
  },
  commercial: {
    defaultCurrency: 'USD',
    taxRatePercent: 8,
    maxDiscountPercent: 10,
    paymentTermsNote: 'Thanh toán theo 4 cột mốc: Ký kết (20%), Kiến trúc & Thiết kế (25%), UAT (35%), Nghiệm thu Go-live (20%).'
  },
  portalConfig: {
    isEnabled: true,
    passcodeEnabled: false,
    passcodeHash: null,
    allowedDomains: [],
    defaultExpirationHours: 168,
    aiAssistantEnabled: true,
    commentsEnabled: true,
    branding: {
      logoUrl: '',
      primaryColor: '#10b981',
      welcomeMessage: 'Chào mừng Quý khách hàng đến với Cổng Thông Tin Đề Xuất Giải Pháp (Client Portal).'
    }
  }
};

export interface ProjectSettingsPermissions {
  members: AccessLevel;
  qualification: AccessLevel;
  rateCards: AccessLevel;
  aiInstructions: AccessLevel;
  portalConfig: AccessLevel;
  generalArchive: AccessLevel;
  deleteProject: AccessLevel;
}

/** Section 5.1 PBAC Access Control Matrix (Solution Architect removed). */
export function resolveProjectSettingsPermissions(projectRole: UserRole | null): ProjectSettingsPermissions {
  if (!projectRole || projectRole === 'ADMIN') {
    return {
      members: 'NO',
      qualification: 'NO',
      rateCards: 'NO',
      aiInstructions: 'NO',
      portalConfig: 'NO',
      generalArchive: 'NO',
      deleteProject: 'NO'
    };
  }
  switch (projectRole) {
    case 'PRESALE_LEAD':
      return {
        members: 'F',
        qualification: 'F',
        rateCards: 'F',
        aiInstructions: 'F',
        portalConfig: 'F',
        generalArchive: 'F',
        deleteProject: 'F'
      };
    case 'PRESALE_CONSULTANT':
      return {
        members: 'V',
        qualification: 'F',
        rateCards: 'V',
        aiInstructions: 'F',
        portalConfig: 'V',
        generalArchive: 'NO',
        deleteProject: 'NO'
      };
    case 'SALES_REP':
      return {
        members: 'V',
        qualification: 'V',
        rateCards: 'V',
        aiInstructions: 'V',
        portalConfig: 'F',
        generalArchive: 'NO',
        deleteProject: 'NO'
      };
    case 'VIEWER':
    default:
      return {
        members: 'V',
        qualification: 'V',
        rateCards: 'V',
        aiInstructions: 'V',
        portalConfig: 'V',
        generalArchive: 'NO',
        deleteProject: 'NO'
      };
  }
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

export interface SystemSecurityPolicy {
  minPasswordLength: number;
  sessionTimeoutMinutes: number;
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
}

export const DEFAULT_SYSTEM_SECURITY_POLICY: SystemSecurityPolicy = {
  minPasswordLength: 12,
  sessionTimeoutMinutes: 1440,
  maxFailedLoginAttempts: 5,
  lockoutDurationMinutes: 15
};

export interface SystemAIConfig {
  activeProvider: 'GEMINI' | 'OPENAI' | 'ANTHROPIC';
  defaultModel: string;
  fallbackEnabled: boolean;
  customApiKey?: string;
  hasCustomApiKey?: boolean;
  maskedApiKey?: string;
  requestsPerMinute: number;
  dailyTokenQuota: number;
  maxProposalsPerDay: number;
}

export const DEFAULT_SYSTEM_AI_CONFIG: SystemAIConfig = {
  activeProvider: 'GEMINI',
  defaultModel: 'gemini-2.5-flash',
  fallbackEnabled: true,
  requestsPerMinute: 60,
  dailyTokenQuota: 1000000,
  maxProposalsPerDay: 100
};

export function normalizeNotificationPreferences(raw: unknown): NotificationPreferences {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
  const result: any = {};
  (Object.keys(DEFAULT_NOTIFICATION_PREFERENCES) as NotificationEventKey[]).forEach((key) => {
    const def = DEFAULT_NOTIFICATION_PREFERENCES[key];
    const row = input[key] && typeof input[key] === 'object' ? input[key] : {};
    result[key] = {
      email: typeof row.email === 'boolean' ? row.email : def.email,
      inApp: typeof row.inApp === 'boolean' ? row.inApp : def.inApp
    };
  });
  return result as NotificationPreferences;
}

export function normalizeExternalIntegrations(raw: unknown): ExternalIntegrations {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
  const meeting = (key: 'googleMeet' | 'zoom' | 'microsoftTeams'): MeetingIntegrationStatus => {
    const row = input[key] && typeof input[key] === 'object' ? input[key] : {};
    return {
      connected: Boolean(row.connected),
      accountEmail: typeof row.accountEmail === 'string' ? row.accountEmail : '',
      autoExtractTranscript: typeof row.autoExtractTranscript === 'boolean' ? row.autoExtractTranscript : true,
      connectedAt: typeof row.connectedAt === 'string' ? row.connectedAt : null
    };
  };
  const figmaRow = input.figma && typeof input.figma === 'object' ? input.figma : {};
  return {
    googleMeet: meeting('googleMeet'),
    zoom: meeting('zoom'),
    microsoftTeams: meeting('microsoftTeams'),
    figma: {
      connected: Boolean(figmaRow.connected),
      workspaceName: typeof figmaRow.workspaceName === 'string' ? figmaRow.workspaceName : '',
      accountHandle: typeof figmaRow.accountHandle === 'string' ? figmaRow.accountHandle : '',
      syncDesignBriefToWireframe:
        typeof figmaRow.syncDesignBriefToWireframe === 'boolean' ? figmaRow.syncDesignBriefToWireframe : true,
      connectedAt: typeof figmaRow.connectedAt === 'string' ? figmaRow.connectedAt : null
    }
  };
}

export function normalizeProjectSettings(raw: unknown, maskSecrets = true): ProjectSettingsPayload {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
  const q = input.qualification && typeof input.qualification === 'object' ? input.qualification : {};
  const ai = input.aiInstructions && typeof input.aiInstructions === 'object' ? input.aiInstructions : {};
  const comm = input.commercial && typeof input.commercial === 'object' ? input.commercial : {};
  const portal = input.portalConfig && typeof input.portalConfig === 'object' ? input.portalConfig : {};
  const branding = portal.branding && typeof portal.branding === 'object' ? portal.branding : {};

  const portalPasscodeHash = typeof portal.passcodeHash === 'string' ? portal.passcodeHash : null;

  return {
    qualification: {
      budgetWeight: typeof q.budgetWeight === 'number' ? q.budgetWeight : DEFAULT_PROJECT_SETTINGS.qualification.budgetWeight,
      authorityWeight: typeof q.authorityWeight === 'number' ? q.authorityWeight : DEFAULT_PROJECT_SETTINGS.qualification.authorityWeight,
      needWeight: typeof q.needWeight === 'number' ? q.needWeight : DEFAULT_PROJECT_SETTINGS.qualification.needWeight,
      timelineWeight: typeof q.timelineWeight === 'number' ? q.timelineWeight : DEFAULT_PROJECT_SETTINGS.qualification.timelineWeight,
      autoApproveThreshold:
        typeof q.autoApproveThreshold === 'number' ? q.autoApproveThreshold : DEFAULT_PROJECT_SETTINGS.qualification.autoApproveThreshold,
      autoRejectThreshold:
        typeof q.autoRejectThreshold === 'number' ? q.autoRejectThreshold : DEFAULT_PROJECT_SETTINGS.qualification.autoRejectThreshold,
      intakeQuestions: Array.isArray(q.intakeQuestions)
        ? q.intakeQuestions.filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
        : [...DEFAULT_PROJECT_SETTINGS.qualification.intakeQuestions]
    },
    aiInstructions: {
      defaultLanguage:
        typeof ai.defaultLanguage === 'string' && ai.defaultLanguage.trim()
          ? ai.defaultLanguage.trim()
          : DEFAULT_PROJECT_SETTINGS.aiInstructions.defaultLanguage,
      toneOfVoice: ['PROFESSIONAL', 'TECHNICAL_DEEP_DIVE', 'EXECUTIVE_PITCH'].includes(ai.toneOfVoice)
        ? ai.toneOfVoice
        : DEFAULT_PROJECT_SETTINGS.aiInstructions.toneOfVoice,
      customContextRules: Array.isArray(ai.customContextRules)
        ? ai.customContextRules.filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
        : [...DEFAULT_PROJECT_SETTINGS.aiInstructions.customContextRules]
    },
    commercial: {
      defaultCurrency:
        typeof comm.defaultCurrency === 'string' && comm.defaultCurrency.trim()
          ? comm.defaultCurrency.trim().toUpperCase()
          : DEFAULT_PROJECT_SETTINGS.commercial.defaultCurrency,
      taxRatePercent:
        typeof comm.taxRatePercent === 'number' ? comm.taxRatePercent : DEFAULT_PROJECT_SETTINGS.commercial.taxRatePercent,
      maxDiscountPercent:
        typeof comm.maxDiscountPercent === 'number' ? comm.maxDiscountPercent : DEFAULT_PROJECT_SETTINGS.commercial.maxDiscountPercent,
      paymentTermsNote:
        typeof comm.paymentTermsNote === 'string'
          ? comm.paymentTermsNote
          : DEFAULT_PROJECT_SETTINGS.commercial.paymentTermsNote
    },
    portalConfig: {
      isEnabled: typeof portal.isEnabled === 'boolean' ? portal.isEnabled : DEFAULT_PROJECT_SETTINGS.portalConfig.isEnabled,
      passcodeEnabled: typeof portal.passcodeEnabled === 'boolean' ? portal.passcodeEnabled : false,
      ...(maskSecrets ? {} : { passcodeHash: portalPasscodeHash }),
      hasPasscode: Boolean(portalPasscodeHash),
      allowedDomains: Array.isArray(portal.allowedDomains)
        ? portal.allowedDomains.filter((d: unknown) => typeof d === 'string' && d.trim().length > 0)
        : [],
      defaultExpirationHours:
        typeof portal.defaultExpirationHours === 'number' && portal.defaultExpirationHours >= 1
          ? portal.defaultExpirationHours
          : DEFAULT_PROJECT_SETTINGS.portalConfig.defaultExpirationHours,
      aiAssistantEnabled: typeof portal.aiAssistantEnabled === 'boolean' ? portal.aiAssistantEnabled : true,
      commentsEnabled: typeof portal.commentsEnabled === 'boolean' ? portal.commentsEnabled : true,
      branding: {
        logoUrl: typeof branding.logoUrl === 'string' ? branding.logoUrl : '',
        primaryColor:
          typeof branding.primaryColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(branding.primaryColor)
            ? branding.primaryColor
            : DEFAULT_PROJECT_SETTINGS.portalConfig.branding.primaryColor,
        welcomeMessage:
          typeof branding.welcomeMessage === 'string' && branding.welcomeMessage.trim()
            ? branding.welcomeMessage
            : DEFAULT_PROJECT_SETTINGS.portalConfig.branding.welcomeMessage
      }
    }
  };
}
