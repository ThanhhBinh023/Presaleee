import { Router } from 'express';
import { SettingsController } from '../controllers/SettingsController.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';

export function createSettingsRouter(controller: SettingsController): Router {
  const router = Router();

  // 1. Account Settings (All authenticated users: F)
  router.get('/account', requireAuth, controller.getAccountSettings);
  router.patch('/account/profile', requireAuth, controller.updateAccountProfile);
  router.post('/account/password', requireAuth, controller.changeAccountPassword);
  router.delete('/account/sessions/others', requireAuth, controller.revokeOtherSessions);
  router.delete('/account/sessions/:sessionId', requireAuth, controller.revokeSingleSession);
  router.post('/account/2fa/setup', requireAuth, controller.setupTwoFactor);
  router.post('/account/2fa/enable', requireAuth, controller.enableTwoFactor);
  router.post('/account/2fa/disable', requireAuth, controller.disableTwoFactor);
  router.patch('/account/notifications', requireAuth, controller.updateNotifications);
  router.post('/account/notifications/read', requireAuth, controller.markNotificationsRead);
  router.patch('/account/integrations', requireAuth, controller.updateIntegrations);
  router.post('/account/invitations/:invitationId/accept', requireAuth, controller.acceptInvitation);

  // 2. Project Settings (PBAC-enforced per project role)
  router.get('/projects/:id', requireAuth, requireOrganization, controller.getProjectSettings);
  router.patch('/projects/:id/qualification', requireAuth, requireOrganization, controller.updateQualificationRules);
  router.patch('/projects/:id/ai-instructions', requireAuth, requireOrganization, controller.updateProjectAIInstructions);
  router.patch('/projects/:id/commercial', requireAuth, requireOrganization, controller.updateProjectCommercial);
  router.patch('/projects/:id/portal', requireAuth, requireOrganization, controller.updateProjectPortalConfig);
  router.patch('/projects/:id/general', requireAuth, requireOrganization, controller.updateProjectGeneral);
  router.delete('/projects/:id', requireAuth, requireOrganization, controller.deleteProject);
  router.post('/projects/:id/invitations', requireAuth, requireOrganization, controller.createInvitation);
  router.post('/projects/:id/invitations/:invitationId/resend', requireAuth, requireOrganization, controller.resendInvitation);
  router.delete('/projects/:id/invitations/:invitationId', requireAuth, requireOrganization, controller.revokeInvitation);
  router.post('/projects/:id/transfer-ownership', requireAuth, requireOrganization, controller.transferLeadOwnership);

  // 3. System Settings (SYSTEM_ADMIN only)
  router.get('/system', requireAuth, controller.getSystemSettings);
  router.patch('/system/security-policy', requireAuth, controller.updateSystemSecurityPolicy);
  router.patch('/system/ai-config', requireAuth, controller.updateSystemAIConfig);
  router.get('/system/users', requireAuth, controller.listGlobalUsers);
  router.patch('/system/users/:userId/status', requireAuth, controller.updateGlobalUserStatus);
  router.post('/system/users/:userId/emergency-reset', requireAuth, controller.emergencyResetUserPassword);
  router.get('/system/audit-logs', requireAuth, controller.listSystemAuditLogs);

  return router;
}
