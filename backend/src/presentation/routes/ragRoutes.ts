import { Router } from 'express';
import { RAGController } from '../controllers/RAGController.js';

export function createRAGRouter(controller: RAGController): Router {
  const router = Router();

  router.post('/search', controller.search);
  router.post('/ingest', controller.ingest);
  router.post('/generate-proposal', controller.generateProposal);

  return router;
}
