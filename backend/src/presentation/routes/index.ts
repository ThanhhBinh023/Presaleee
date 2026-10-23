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

export function createApiRouter(
  ragController: RAGController,
  proposalController: ProposalController,
  leadIntakeController: LeadIntakeController,
  authController: AuthController,
  dashboardController: DashboardController,
  knowledgeController: KnowledgeController
): Router {
  const router = Router();

  router.use('/rag', createRAGRouter(ragController));
  router.use('/knowledge', createKnowledgeRouter(knowledgeController));
  router.use('/proposals', createProposalRouter(proposalController));
  router.use('/leads', createLeadIntakeRouter(leadIntakeController));
  router.post('/leads/:leadId/proposals', requireAuth, requireOrganization, proposalController.createFromLead);
  router.use('/auth', createAuthRouter(authController));
  router.use('/dashboard', createDashboardRouter(dashboardController));

  return router;
}
