import { Router } from 'express';
import { RAGController } from '../controllers/RAGController.js';
import { createRAGRouter } from './ragRoutes.js';

export function createApiRouter(ragController: RAGController): Router {
  const router = Router();

  router.use('/rag', createRAGRouter(ragController));

  return router;
}
