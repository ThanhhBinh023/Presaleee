import { Router } from 'express';
import { RAGController } from '../controllers/RAGController.js';
import { ProposalController } from '../controllers/ProposalController.js';
import { LeadIntakeController } from '../controllers/LeadIntakeController.js';
import { createRAGRouter } from './ragRoutes.js';
import { createProposalRouter } from './proposalRoutes.js';
import { createLeadIntakeRouter } from './leadIntakeRoutes.js';

export function createApiRouter(
  ragController: RAGController,
  proposalController: ProposalController,
  leadIntakeController: LeadIntakeController
): Router {
  const router = Router();

  router.use('/rag', createRAGRouter(ragController));
  router.use('/proposals', createProposalRouter(proposalController));
  router.use('/leads', createLeadIntakeRouter(leadIntakeController));

  return router;
}
