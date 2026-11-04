import { Router } from 'express';
import { LeadIntakeController } from '../controllers/LeadIntakeController.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';

export function createLeadIntakeRouter(controller: LeadIntakeController): Router {
  const router = Router();

  router.use(requireAuth, requireOrganization);
  // Analyze RFP text and return an unsaved, frontend-ready Lead draft.
  router.post('/intake/analyze', controller.analyze);
  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id/qualifications/latest', controller.getLatestQualification);
  router.post('/:id/qualifications', controller.qualify);
  router.patch('/:id/status', controller.updateStatus);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.delete);

  return router;
}
