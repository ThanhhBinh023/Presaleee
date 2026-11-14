import { Router } from 'express';
import { KnowledgeController } from '../controllers/KnowledgeController.js';
import { requireAuth, requireOrganization, requireNotViewer } from '../middlewares/requireAuth.js';

export function createKnowledgeRouter(controller: KnowledgeController): Router {
  const router = Router();
  router.use(requireAuth, requireOrganization);
  router.post('/ask', controller.ask);
  router.post('/documents', requireNotViewer, controller.ingest);
  router.get('/documents', controller.list);
  router.get('/documents/:id', controller.get);
  router.delete('/documents/:id', requireNotViewer, controller.delete);
  return router;
}
