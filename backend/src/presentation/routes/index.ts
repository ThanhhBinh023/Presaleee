import { Router } from 'express';
import { RAGController } from '../controllers/RAGController.js';
import { ProposalController } from '../controllers/ProposalController.js';
import { createRAGRouter } from './ragRoutes.js';
import { createProposalRouter } from './proposalRoutes.js';

export function createApiRouter(
  ragController: RAGController,
  proposalController: ProposalController
): Router {
  const router = Router();

  router.use('/rag', createRAGRouter(ragController));
  router.use('/proposals', createProposalRouter(proposalController));

  return router;
}
