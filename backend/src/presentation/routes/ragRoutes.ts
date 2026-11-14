import { Router } from 'express';
import { RAGController } from '../controllers/RAGController.js';
import { requireAuth, requireOrganization, requireNotViewer } from '../middlewares/requireAuth.js';

export function createRAGRouter(controller: RAGController): Router {
  const router = Router();
  router.use(requireAuth, requireOrganization);

  router.post('/search', controller.search);
  router.post('/ingest', requireNotViewer, controller.ingest);
  router.post('/generate-proposal', requireNotViewer, controller.generateProposal);

  return router;
}

