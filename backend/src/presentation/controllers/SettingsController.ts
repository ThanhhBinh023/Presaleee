import { Request, Response, NextFunction } from 'express';
import { PostgresSettingsRepository } from '../../infrastructure/database/repositories/PostgresSettingsRepository.js';
import { IAuthRepository } from '../../domain/repositories/IAuthRepository.js';
import { IAuditRepository } from '../../domain/repositories/IAuditRepository.js';
import { USER_ROLES, USER_STATUSES, UserRole } from '../../domain/entities/AuthUser.js';
import {
  DEFAULT_PROJECT_SETTINGS,
  ExternalIntegrations,
  NotificationPreferences,
  ProjectPortalConfig,
  resolveProjectSettingsPermissions
} from '../../domain/entities/Settings.js';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../../application/services/AuthCredentialsService.js';
import { hashToken } from '../../application/services/AuthTokenService.js';
import { buildOtpAuthUri, generateTotpSecret, verifyTotpCode } from '../../application/services/TotpService.js';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';
import { env } from '../../infrastructure/config/env.js';

function routeParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] || '' : val || '';
}

function getRefreshCookieHash(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0 || part.slice(0, idx).trim() !== 'presaleee_refresh') continue;
    try {
      const token = decodeURIComponent(part.slice(idx + 1).trim());
      return token ? hashToken(token) : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function requireAdmin(req: Request): { userId: string; organizationId: string | null } {
  if (!req.auth?.sub) throw new UnauthorizedError('Authentication required.');
  if (req.auth.role !== 'ADMIN') {
    throw new ForbiddenError('Chỉ Quản trị viên Hệ thống (SYSTEM_ADMIN) mới có quyền truy cập Cài đặt Hệ thống.');
  }
  return { userId: req.auth.sub, organizationId: req.auth.organizationId };
}

export class SettingsController {
  constructor(
    private readonly settingsRepo: PostgresSettingsRepository,
    private readonly authRepo: IAuthRepository,
    private readonly auditRepo: IAuditRepository
  ) {}

  // ============================================================================
  // 1. ACCOUNT SETTINGS (All Roles: F)
  // ============================================================================

  getAccountSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const currentRefreshHash = getRefreshCookieHash(req);
      const data = await this.settingsRepo.getAccountSettings(req.auth.sub, currentRefreshHash);
      const notificationsFeed = await this.settingsRepo.listUserNotifications(req.auth.sub, 30);
      const pendingInvitations = await this.settingsRepo.listMyPendingInvitations(req.auth.sub, req.auth.email);
      res.status(200).json({
        success: true,
        data: {
          ...data,
          notificationFeed: notificationsFeed.items,
          unreadNotificationCount: notificationsFeed.unreadCount,
          pendingInvitations
        }
      });
    } catch (error) { next(error); }
  };

  updateAccountProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const fullName = typeof body.fullName === 'string' && body.fullName.trim() ? body.fullName.trim().slice(0, 255) : undefined;
      let avatarUrl: string | null | undefined = undefined;
      if (body.avatarUrl !== undefined) {
        if (typeof body.avatarUrl === 'string' && body.avatarUrl.trim()) {
          const trimmedAvatar = body.avatarUrl.trim();
          if (trimmedAvatar.length > 500_000) {
            throw new ValidationError('Ảnh đại diện vượt quá kích thước cho phép (tối đa ~350KB). Vui lòng chọn ảnh nhỏ hơn.');
          }
          avatarUrl = trimmedAvatar;
        } else {
          avatarUrl = null;
        }
      }
      const jobTitle = typeof body.jobTitle === 'string' ? body.jobTitle.trim().slice(0, 150) : undefined;
      const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 50) : undefined;
      const displaySignature = typeof body.displaySignature === 'string' ? body.displaySignature.trim().slice(0, 500) : undefined;

      const updated = await this.settingsRepo.updateOwnExtendedProfile(req.auth.sub, {
        fullName,
        avatarUrl,
        jobTitle,
        phone,
        displaySignature
      });
      res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
  };

  changeAccountPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const { currentPassword, newPassword } = req.body ?? {};
      if (typeof currentPassword !== 'string' || !currentPassword) {
        throw new ValidationError('Vui lòng nhập mật khẩu hiện tại.');
      }
      const policy = await this.settingsRepo.getSecurityPolicy();
      if (typeof newPassword !== 'string' || newPassword.length < policy.minPasswordLength) {
        throw new ValidationError(`Mật khẩu mới phải có tối thiểu ${policy.minPasswordLength} ký tự theo chính sách bảo mật hệ thống.`);
      }
      const validated = validatePasswordStrength(newPassword);
      const user = await this.authRepo.findUserById(req.auth.sub);
      if (!user || !user.passwordHash) throw new UnauthorizedError('Tài khoản không hợp lệ.');
      const matches = await verifyPassword(currentPassword, user.passwordHash);
      if (!matches) throw new ValidationError('Mật khẩu hiện tại không chính xác.');

      const nextHash = await hashPassword(validated);
      await this.settingsRepo.updatePasswordHash(user.id, nextHash);
      await this.auditRepo.record({
        organizationId: user.organizationId || '00000000-0000-0000-0000-000000000000',
        actorId: user.id,
        action: 'ACCOUNT_PASSWORD_CHANGED',
        entityType: 'user',
        entityId: user.id,
        payload: { selfService: true },
        ipAddress: req.socket.remoteAddress
      }).catch(() => {});

      res.status(200).json({ success: true, data: { message: 'Đổi mật khẩu thành công. Các phiên đăng nhập cũ đã được thu hồi.' } });
    } catch (error) { next(error); }
  };

  revokeOtherSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const currentRefreshHash = getRefreshCookieHash(req);
      const revokedCount = await this.settingsRepo.revokeOtherSessions(req.auth.sub, currentRefreshHash);
      res.status(200).json({ success: true, data: { revokedCount } });
    } catch (error) { next(error); }
  };

  revokeSingleSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const sessionId = routeParam(req, 'sessionId');
      const revoked = await this.settingsRepo.revokeSessionById(req.auth.sub, sessionId);
      res.status(200).json({ success: true, data: { revoked } });
    } catch (error) { next(error); }
  };

  setupTwoFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const state = await this.settingsRepo.getTwoFactorState(req.auth.sub);
      const secret = generateTotpSecret();
      await this.settingsRepo.setPendingTwoFactorSecret(req.auth.sub, secret);
      const otpauthUrl = buildOtpAuthUri(state.email, secret, 'Presaleee');
      res.status(200).json({
        success: true,
        data: { secret, otpauthUrl }
      });
    } catch (error) { next(error); }
  };

  enableTwoFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const { code } = req.body ?? {};
      if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
        throw new ValidationError('Vui lòng nhập mã xác thực 6 chữ số từ ứng dụng Authenticator.');
      }
      const state = await this.settingsRepo.getTwoFactorState(req.auth.sub);
      if (!state.secret) {
        throw new ValidationError('Chưa khởi tạo mã bí mật 2FA. Vui lòng bấm Thiết lập 2FA trước.');
      }
      if (!verifyTotpCode(state.secret, code.trim())) {
        throw new ValidationError('Mã OTP 6 chữ số không chính xác hoặc đã hết hạn.');
      }
      await this.settingsRepo.enableTwoFactor(req.auth.sub);
      await this.auditRepo.record({
        organizationId: req.auth.organizationId || '00000000-0000-0000-0000-000000000000',
        actorId: req.auth.sub,
        action: 'ACCOUNT_2FA_ENABLED',
        entityType: 'user',
        entityId: req.auth.sub,
        payload: {},
        ipAddress: req.socket.remoteAddress
      }).catch(() => {});
      res.status(200).json({ success: true, data: { twoFactorEnabled: true } });
    } catch (error) { next(error); }
  };

  disableTwoFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const { password } = req.body ?? {};
      const user = await this.authRepo.findUserById(req.auth.sub);
      if (!user || !user.passwordHash) throw new UnauthorizedError();
      if (typeof password !== 'string' || !(await verifyPassword(password, user.passwordHash))) {
        throw new ValidationError('Vui lòng nhập đúng mật khẩu tài khoản để tắt 2FA.');
      }
      await this.settingsRepo.disableTwoFactor(req.auth.sub);
      await this.auditRepo.record({
        organizationId: req.auth.organizationId || '00000000-0000-0000-0000-000000000000',
        actorId: req.auth.sub,
        action: 'ACCOUNT_2FA_DISABLED',
        entityType: 'user',
        entityId: req.auth.sub,
        payload: {},
        ipAddress: req.socket.remoteAddress
      }).catch(() => {});
      res.status(200).json({ success: true, data: { twoFactorEnabled: false } });
    } catch (error) { next(error); }
  };

  updateNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const prefs = req.body as NotificationPreferences;
      const updated = await this.settingsRepo.updateNotificationPreferences(req.auth.sub, prefs);
      res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
  };

  markNotificationsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((x: unknown) => typeof x === 'string') : undefined;
      await this.settingsRepo.markNotificationsRead(req.auth.sub, ids);
      res.status(200).json({ success: true, data: { ok: true } });
    } catch (error) { next(error); }
  };

  updateIntegrations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const integrations = req.body as ExternalIntegrations;
      const updated = await this.settingsRepo.updateExternalIntegrations(req.auth.sub, integrations);
      res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
  };

  acceptInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const invitationId = routeParam(req, 'invitationId');
      const result = await this.settingsRepo.acceptProjectInvitation(invitationId, req.auth.sub, req.auth.email);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  };

  // ============================================================================
  // 2. PROJECT WORKSPACE SETTINGS (Strict PBAC Section 5.1)
  // ============================================================================

  private async requireProjectAccess(req: Request, leadId: string) {
    if (!req.auth?.sub || !req.auth.organizationId) {
      throw new ForbiddenError('Authentication and organization context required.');
    }
    const projectRole = await this.settingsRepo.resolveCallerProjectRole(leadId, req.auth.sub);
    if (!projectRole) {
      if (req.auth.role === 'ADMIN') {
        throw new ForbiddenError(
          'Theo mô hình PBAC, System Admin không có quyền truy cập vào Project Settings trừ khi được mời đích danh vào dự án đó.'
        );
      }
      throw new ForbiddenError('Bạn không phải là thành viên của dự án này.');
    }
    return {
      userId: req.auth.sub,
      organizationId: req.auth.organizationId,
      projectRole,
      permissions: resolveProjectSettingsPermissions(projectRole)
    };
  }

  getProjectSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const scope = await this.requireProjectAccess(req, leadId);
      const bundle = await this.settingsRepo.getProjectSettingsBundle(leadId, scope.organizationId);
      res.status(200).json({
        success: true,
        data: {
          ...bundle,
          callerProjectRole: scope.projectRole,
          permissions: scope.permissions
        }
      });
    } catch (error) { next(error); }
  };

  updateQualificationRules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const scope = await this.requireProjectAccess(req, leadId);
      if (scope.permissions.qualification !== 'F') {
        throw new ForbiddenError('Chỉ Presale Lead hoặc Presale Consultant mới có quyền chỉnh sửa cấu hình Qualification & BANT Rules.');
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const budgetWeight = Number(body.budgetWeight ?? DEFAULT_PROJECT_SETTINGS.qualification.budgetWeight);
      const authorityWeight = Number(body.authorityWeight ?? DEFAULT_PROJECT_SETTINGS.qualification.authorityWeight);
      const needWeight = Number(body.needWeight ?? DEFAULT_PROJECT_SETTINGS.qualification.needWeight);
      const timelineWeight = Number(body.timelineWeight ?? DEFAULT_PROJECT_SETTINGS.qualification.timelineWeight);
      if (budgetWeight + authorityWeight + needWeight + timelineWeight !== 100) {
        throw new ValidationError('Tổng trọng số BANT (Budget + Authority + Need + Timeline) phải bằng 100%.');
      }
      const autoApproveThreshold = Number(body.autoApproveThreshold ?? 75);
      const autoRejectThreshold = Number(body.autoRejectThreshold ?? 40);
      if (autoRejectThreshold >= autoApproveThreshold || autoApproveThreshold > 100 || autoRejectThreshold < 0) {
        throw new ValidationError('Ngưỡng từ chối phải nhỏ hơn ngưỡng chấp nhận (0–100).');
      }
      const intakeQuestions = Array.isArray(body.intakeQuestions)
        ? body.intakeQuestions.map((q: unknown) => String(q).trim()).filter(Boolean).slice(0, 30)
        : DEFAULT_PROJECT_SETTINGS.qualification.intakeQuestions;

      const updated = await this.settingsRepo.updateProjectSettingsSection(leadId, scope.organizationId, 'qualification', {
        budgetWeight,
        authorityWeight,
        needWeight,
        timelineWeight,
        autoApproveThreshold,
        autoRejectThreshold,
        intakeQuestions
      });
      res.status(200).json({ success: true, data: updated.qualification });
    } catch (error) { next(error); }
  };

  updateProjectAIInstructions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const scope = await this.requireProjectAccess(req, leadId);
      if (scope.permissions.aiInstructions !== 'F') {
        throw new ForbiddenError('Chỉ Presale Lead hoặc Presale Consultant mới có quyền chỉnh sửa Chỉ dẫn AI của dự án.');
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const defaultLanguage = typeof body.defaultLanguage === 'string' && body.defaultLanguage.trim()
        ? body.defaultLanguage.trim().slice(0, 50)
        : 'Tiếng Việt';
      const toneOfVoice = ['PROFESSIONAL', 'TECHNICAL_DEEP_DIVE', 'EXECUTIVE_PITCH'].includes(body.toneOfVoice)
        ? body.toneOfVoice
        : 'PROFESSIONAL';
      const customContextRules = Array.isArray(body.customContextRules)
        ? body.customContextRules.map((r: unknown) => String(r).trim()).filter(Boolean).slice(0, 30)
        : [];

      const updated = await this.settingsRepo.updateProjectSettingsSection(leadId, scope.organizationId, 'aiInstructions', {
        defaultLanguage,
        toneOfVoice,
        customContextRules
      });
      res.status(200).json({ success: true, data: updated.aiInstructions });
    } catch (error) { next(error); }
  };

  updateProjectCommercial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const scope = await this.requireProjectAccess(req, leadId);
      if (scope.permissions.rateCards !== 'F') {
        throw new ForbiddenError('Chỉ Presale Lead mới có quyền chỉnh sửa cấu hình Thương mại & Rate Card của dự án.');
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const updated = await this.settingsRepo.updateProjectSettingsSection(leadId, scope.organizationId, 'commercial', {
        defaultCurrency: typeof body.defaultCurrency === 'string' ? body.defaultCurrency.trim().toUpperCase().slice(0, 10) : 'USD',
        taxRatePercent: Math.max(0, Math.min(50, Number(body.taxRatePercent ?? 8))),
        maxDiscountPercent: Math.max(0, Math.min(80, Number(body.maxDiscountPercent ?? 10))),
        paymentTermsNote: typeof body.paymentTermsNote === 'string' ? body.paymentTermsNote.trim().slice(0, 1000) : ''
      });
      res.status(200).json({ success: true, data: updated.commercial });
    } catch (error) { next(error); }
  };

  updateProjectPortalConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const scope = await this.requireProjectAccess(req, leadId);
      if (scope.permissions.portalConfig !== 'F') {
        throw new ForbiddenError('Chỉ Presale Lead hoặc Sales Rep mới có quyền cấu hình Client Portal.');
      }
      const rawCurrent = await this.settingsRepo.getRawProjectSettings(leadId, scope.organizationId);
      const body = req.body && typeof req.body === 'object' ? req.body : {};

      let passcodeHash = rawCurrent.portalConfig.passcodeHash || null;
      const passcodeEnabled = Boolean(body.passcodeEnabled);
      if (!passcodeEnabled) {
        passcodeHash = null;
      } else if (typeof body.passcode === 'string' && body.passcode.trim().length > 0) {
        const cleanPasscode = body.passcode.trim();
        if (cleanPasscode.length < 4 || cleanPasscode.length > 32) {
          throw new ValidationError('Passcode truy cập Client Portal phải có độ dài 4–32 ký tự.');
        }
        passcodeHash = hashToken(cleanPasscode);
      } else if (!passcodeHash) {
        throw new ValidationError('Vui lòng nhập Passcode (tối thiểu 4 ký tự) khi bật tính năng bảo vệ bằng mật khẩu.');
      }

      const brandingIn = body.branding && typeof body.branding === 'object' ? body.branding : {};
      const nextPortalConfig: ProjectPortalConfig = {
        isEnabled: typeof body.isEnabled === 'boolean' ? body.isEnabled : rawCurrent.portalConfig.isEnabled,
        passcodeEnabled,
        passcodeHash,
        allowedDomains: Array.isArray(body.allowedDomains)
          ? body.allowedDomains.map((d: unknown) => String(d).trim().toLowerCase()).filter(Boolean)
          : rawCurrent.portalConfig.allowedDomains,
        defaultExpirationHours: Math.max(1, Math.min(720, Number(body.defaultExpirationHours ?? 168))),
        aiAssistantEnabled:
          typeof body.aiAssistantEnabled === 'boolean' ? body.aiAssistantEnabled : rawCurrent.portalConfig.aiAssistantEnabled,
        commentsEnabled:
          typeof body.commentsEnabled === 'boolean' ? body.commentsEnabled : rawCurrent.portalConfig.commentsEnabled,
        branding: {
          logoUrl: typeof brandingIn.logoUrl === 'string' ? brandingIn.logoUrl.trim().slice(0, 2000) : rawCurrent.portalConfig.branding.logoUrl,
          primaryColor:
            typeof brandingIn.primaryColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(brandingIn.primaryColor)
              ? brandingIn.primaryColor
              : rawCurrent.portalConfig.branding.primaryColor,
          welcomeMessage:
            typeof brandingIn.welcomeMessage === 'string'
              ? brandingIn.welcomeMessage.trim().slice(0, 1000)
              : rawCurrent.portalConfig.branding.welcomeMessage
        }
      };

      const updated = await this.settingsRepo.updateProjectSettingsSection(leadId, scope.organizationId, 'portalConfig', nextPortalConfig);
      res.status(200).json({ success: true, data: updated.portalConfig });
    } catch (error) { next(error); }
  };

  updateProjectGeneral = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const scope = await this.requireProjectAccess(req, leadId);
      if (scope.permissions.generalArchive !== 'F') {
        throw new ForbiddenError('Chỉ Presale Lead của dự án mới có quyền chỉnh sửa thông tin chung hoặc lưu trữ dự án.');
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const updated = await this.settingsRepo.updateProjectGeneral(leadId, scope.organizationId, {
        title: typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 255) : undefined,
        clientName: typeof body.clientName === 'string' ? body.clientName.trim().slice(0, 255) : undefined,
        industry: typeof body.industry === 'string' ? body.industry.trim().slice(0, 150) : undefined,
        description: typeof body.description === 'string' ? body.description.trim().slice(0, 4000) : undefined,
        isArchived: typeof body.isArchived === 'boolean' ? body.isArchived : undefined,
        archiveOutcome: body.archiveOutcome !== undefined ? (body.archiveOutcome ? String(body.archiveOutcome) : null) : undefined
      });
      res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
  };

  deleteProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const scope = await this.requireProjectAccess(req, leadId);
      if (scope.permissions.deleteProject !== 'F') {
        throw new ForbiddenError('Chỉ Presale Lead mới có quyền xóa vĩnh viễn dự án (Danger Zone).');
      }
      const confirmTitle = typeof req.body?.confirmTitle === 'string' ? req.body.confirmTitle : '';
      const result = await this.settingsRepo.deleteProject(leadId, scope.organizationId, confirmTitle);
      await this.auditRepo.record({
        organizationId: scope.organizationId,
        actorId: scope.userId,
        action: 'PROJECT_DELETED',
        entityType: 'lead',
        entityId: leadId,
        payload: { deletedTitle: result.deletedTitle },
        ipAddress: req.socket.remoteAddress
      }).catch(() => {});
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  };

  createInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const scope = await this.requireProjectAccess(req, leadId);
      if (scope.permissions.members !== 'F') {
        throw new ForbiddenError('Chỉ Presale Lead mới có quyền gửi lời mời thành viên.');
      }
      const { identifier, projectRole } = req.body ?? {};
      if (typeof identifier !== 'string' || !identifier.trim()) {
        throw new ValidationError('Vui lòng nhập Email hoặc Họ tên thành viên trong tổ chức.');
      }
      const allowedProjectRoles: readonly UserRole[] = ['PRESALE_LEAD', 'PRESALE_CONSULTANT', 'SALES_REP', 'VIEWER'];
      if (!allowedProjectRoles.includes(projectRole)) {
        throw new ValidationError(`Vai trò dự án không hợp lệ. Chỉ chấp nhận: ${allowedProjectRoles.join(', ')}`);
      }
      const invitation = await this.settingsRepo.createProjectInvitation({
        projectId: leadId,
        organizationId: scope.organizationId,
        identifier,
        projectRole,
        invitedBy: scope.userId
      });
      res.status(201).json({ success: true, data: invitation });
    } catch (error) { next(error); }
  };

  resendInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const invitationId = routeParam(req, 'invitationId');
      const scope = await this.requireProjectAccess(req, leadId);
      if (scope.permissions.members !== 'F') throw new ForbiddenError('Chỉ Presale Lead mới có quyền gửi lại lời mời.');
      const updated = await this.settingsRepo.resendProjectInvitation(leadId, invitationId);
      res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
  };

  revokeInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const invitationId = routeParam(req, 'invitationId');
      const scope = await this.requireProjectAccess(req, leadId);
      if (scope.permissions.members !== 'F') throw new ForbiddenError('Chỉ Presale Lead mới có quyền thu hồi lời mời.');
      await this.settingsRepo.revokeProjectInvitation(leadId, invitationId);
      res.status(200).json({ success: true, data: { revoked: true } });
    } catch (error) { next(error); }
  };

  transferLeadOwnership = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const scope = await this.requireProjectAccess(req, leadId);
      if (scope.permissions.members !== 'F') {
        throw new ForbiddenError('Chỉ Presale Lead hiện tại mới có quyền chuyển giao quyền Trưởng dự án.');
      }
      const targetUserId = typeof req.body?.targetUserId === 'string' ? req.body.targetUserId : '';
      if (!targetUserId) throw new ValidationError('Vui lòng chọn thành viên nhận bàn giao quyền Lead.');
      await this.settingsRepo.transferLeadOwnership(leadId, scope.organizationId, scope.userId, targetUserId);
      await this.auditRepo.record({
        organizationId: scope.organizationId,
        actorId: scope.userId,
        action: 'PROJECT_OWNERSHIP_TRANSFERRED',
        entityType: 'lead',
        entityId: leadId,
        payload: { newLeadUserId: targetUserId },
        ipAddress: req.socket.remoteAddress
      }).catch(() => {});
      res.status(200).json({ success: true, data: { transferredTo: targetUserId } });
    } catch (error) { next(error); }
  };

  // ============================================================================
  // 3. SYSTEM SETTINGS (SYSTEM ADMIN ONLY)
  // ============================================================================

  getSystemSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      requireAdmin(req);
      const [securityPolicy, aiConfig] = await Promise.all([
        this.settingsRepo.getSecurityPolicy(),
        this.settingsRepo.getAIConfig(false)
      ]);
      res.status(200).json({
        success: true,
        data: { securityPolicy, aiConfig }
      });
    } catch (error) { next(error); }
  };

  updateSystemSecurityPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const admin = requireAdmin(req);
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const nextPolicy = {
        minPasswordLength: Math.max(8, Math.min(64, Number(body.minPasswordLength ?? 12))),
        sessionTimeoutMinutes: Math.max(15, Math.min(43200, Number(body.sessionTimeoutMinutes ?? 1440))),
        maxFailedLoginAttempts: Math.max(3, Math.min(20, Number(body.maxFailedLoginAttempts ?? 5))),
        lockoutDurationMinutes: Math.max(1, Math.min(1440, Number(body.lockoutDurationMinutes ?? 15)))
      };
      const updated = await this.settingsRepo.updateSecurityPolicy(nextPolicy, admin.userId);
      await this.auditRepo.record({
        organizationId: admin.organizationId || '00000000-0000-0000-0000-000000000000',
        actorId: admin.userId,
        action: 'SYSTEM_SECURITY_POLICY_UPDATED',
        entityType: 'system_settings',
        payload: nextPolicy,
        ipAddress: req.socket.remoteAddress
      }).catch(() => {});
      res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
  };

  updateSystemAIConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const admin = requireAdmin(req);
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const updated = await this.settingsRepo.updateAIConfig(
        {
          activeProvider: ['GEMINI', 'OPENAI', 'ANTHROPIC'].includes(body.activeProvider) ? body.activeProvider : undefined,
          defaultModel: typeof body.defaultModel === 'string' ? body.defaultModel.trim().slice(0, 100) : undefined,
          fallbackEnabled: typeof body.fallbackEnabled === 'boolean' ? body.fallbackEnabled : undefined,
          customApiKey: typeof body.customApiKey === 'string' ? body.customApiKey : undefined,
          clearCustomApiKey: Boolean(body.clearCustomApiKey),
          requestsPerMinute: body.requestsPerMinute !== undefined ? Math.max(5, Math.min(5000, Number(body.requestsPerMinute))) : undefined,
          dailyTokenQuota: body.dailyTokenQuota !== undefined ? Math.max(1000, Number(body.dailyTokenQuota)) : undefined,
          maxProposalsPerDay: body.maxProposalsPerDay !== undefined ? Math.max(1, Number(body.maxProposalsPerDay)) : undefined
        },
        admin.userId
      );
      await this.auditRepo.record({
        organizationId: admin.organizationId || '00000000-0000-0000-0000-000000000000',
        actorId: admin.userId,
        action: 'SYSTEM_AI_CONFIG_UPDATED',
        entityType: 'system_settings',
        payload: {
          activeProvider: updated.activeProvider,
          defaultModel: updated.defaultModel,
          apiKeyUpdated: Boolean(body.customApiKey || body.clearCustomApiKey),
          requestsPerMinute: updated.requestsPerMinute,
          dailyTokenQuota: updated.dailyTokenQuota
        },
        ipAddress: req.socket.remoteAddress
      }).catch(() => {});
      res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
  };

  listGlobalUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      requireAdmin(req);
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
      const result = await this.settingsRepo.listGlobalUsers({
        search: typeof req.query.search === 'string' ? req.query.search.trim() : undefined,
        role: typeof req.query.role === 'string' && (USER_ROLES as readonly string[]).includes(req.query.role) ? req.query.role : undefined,
        status: typeof req.query.status === 'string' && (USER_STATUSES as readonly string[]).includes(req.query.status) ? req.query.status : undefined,
        page,
        limit
      });
      res.status(200).json({
        success: true,
        data: result.users,
        meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages }
      });
    } catch (error) { next(error); }
  };

  updateGlobalUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const admin = requireAdmin(req);
      const targetUserId = routeParam(req, 'userId');
      const status = req.body?.status;
      if (status !== 'ACTIVE' && status !== 'DEACTIVATED') {
        throw new ValidationError('Trạng thái người dùng chỉ chấp nhận ACTIVE hoặc DEACTIVATED.');
      }
      await this.settingsRepo.setUserGlobalStatus(targetUserId, status, admin.userId);
      await this.auditRepo.record({
        organizationId: admin.organizationId || '00000000-0000-0000-0000-000000000000',
        actorId: admin.userId,
        action: status === 'DEACTIVATED' ? 'SYSTEM_USER_BLOCKED' : 'SYSTEM_USER_ACTIVATED',
        entityType: 'user',
        entityId: targetUserId,
        payload: { status },
        ipAddress: req.socket.remoteAddress
      }).catch(() => {});
      res.status(200).json({ success: true, data: { userId: targetUserId, status } });
    } catch (error) { next(error); }
  };

  emergencyResetUserPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const admin = requireAdmin(req);
      const targetUserId = routeParam(req, 'userId');
      const result = await this.settingsRepo.createEmergencyPasswordReset(
        targetUserId,
        env.frontendUrl,
        env.passwordResetTokenTtlMinutes
      );
      await this.auditRepo.record({
        organizationId: admin.organizationId || '00000000-0000-0000-0000-000000000000',
        actorId: admin.userId,
        action: 'SYSTEM_EMERGENCY_PASSWORD_RESET',
        entityType: 'user',
        entityId: targetUserId,
        payload: { targetEmail: result.email },
        ipAddress: req.socket.remoteAddress
      }).catch(() => {});
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  };

  listSystemAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      requireAdmin(req);
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.max(1, Math.min(100, Number(req.query.limit || 25)));
      const result = await this.settingsRepo.listSystemSecurityAuditLogs({
        action: typeof req.query.action === 'string' ? req.query.action.trim() : undefined,
        page,
        limit
      });
      res.status(200).json({
        success: true,
        data: result.logs,
        meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages }
      });
    } catch (error) { next(error); }
  };
}
