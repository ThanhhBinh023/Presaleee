import { Router } from 'express';
import { RAGController } from '../controllers/RAGController.js';
import { ProposalController } from '../controllers/ProposalController.js';
import { LeadIntakeController } from '../controllers/LeadIntakeController.js';
import { createRAGRouter } from './ragRoutes.js';
import { createProposalRouter } from './proposalRoutes.js';
import { createLeadIntakeRouter } from './leadIntakeRoutes.js';
import { AuthController } from '../controllers/AuthController.js';
import { createAuthRouter } from './authRoutes.js';
import { DashboardController } from '../controllers/DashboardController.js';
import { createDashboardRouter } from './dashboardRoutes.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';
import { KnowledgeController } from '../controllers/KnowledgeController.js';
import { createKnowledgeRouter } from './knowledgeRoutes.js';
import { MeetingController } from '../controllers/MeetingController.js';
import { createMeetingRouter } from './meetingRoutes.js';
import { PortalController } from '../controllers/PortalController.js';
import { createPortalRouter } from './portalRoutes.js';
import { IPortalRepository } from '../../domain/repositories/IPortalRepository.js';
import { ClientController } from '../controllers/ClientController.js';
import { createClientRouter } from './clientRoutes.js';
import { RateCardController } from '../controllers/RateCardController.js';
import { createRateCardRouter } from './rateCardRoutes.js';
import { UserController } from '../controllers/UserController.js';
import { createUserRouter } from './userRoutes.js';
import { AuditController } from '../controllers/AuditController.js';
import { createAuditRouter } from './auditRoutes.js';

export function createApiRouter(
  ragController: RAGController,
  proposalController: ProposalController,
  leadIntakeController: LeadIntakeController,
  authController: AuthController,
  dashboardController: DashboardController,
  knowledgeController: KnowledgeController,
  meetingController: MeetingController,
  portalController: PortalController,
  portalRepository: IPortalRepository,
  clientController: ClientController,
  rateCardController: RateCardController,
  userController: UserController,
  auditController: AuditController
): Router {
  const router = Router();

  router.use('/rag', createRAGRouter(ragController));
  router.use('/knowledge', createKnowledgeRouter(knowledgeController));
  router.use('/proposals', createProposalRouter(proposalController));
  router.use('/leads', createLeadIntakeRouter(leadIntakeController));
  router.get('/leads/:leadId/meetings', requireAuth, requireOrganization, meetingController.listForLead);
  router.post('/leads/:leadId/meetings', requireAuth, requireOrganization, meetingController.createForLead);
  router.post('/leads/:leadId/proposals', requireAuth, requireOrganization, proposalController.createFromLead);
  router.use('/meetings', createMeetingRouter(meetingController));
  router.use('/portal', createPortalRouter(portalController, portalRepository));
  router.get('/proposals/:proposalId/portal-materials', requireAuth, requireOrganization, portalController.listProposalMaterials);
  router.post('/proposals/:proposalId/portal-materials', requireAuth, requireOrganization, portalController.createMaterial);
  router.delete('/proposals/:proposalId/portal-materials/:materialId', requireAuth, requireOrganization, portalController.deleteMaterial);
  router.get('/proposals/:proposalId/portal-sessions', requireAuth, requireOrganization, portalController.listProposalSessions);
  router.use('/clients', createClientRouter(clientController));
  router.use('/rate-cards', createRateCardRouter(rateCardController));
  router.use('/users', createUserRouter(userController));
  router.use('/audit-logs', createAuditRouter(auditController));
  router.use('/auth', createAuthRouter(authController));
  router.use('/dashboard', createDashboardRouter(dashboardController));

  return router;
}
