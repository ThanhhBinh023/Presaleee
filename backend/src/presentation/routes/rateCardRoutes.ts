import { Router, RequestHandler } from 'express';
import { RateCardController } from '../controllers/RateCardController.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { ORGANIZATION_ADMIN_ROLES } from '../../domain/entities/User.js';

export function createRateCardRouter(controller: RateCardController): Router {
  const router = Router();
  const readAccess: RequestHandler[] = [requireAuth, requireOrganization];
  const writeAccess: RequestHandler[] = [requireAuth, requireOrganization, requireRole(...ORGANIZATION_ADMIN_ROLES)];

  router.get('/', readAccess, controller.list);
  router.post('/', writeAccess, controller.create);
  // Deterministic quotation math: the LLM proposes effort, the backend prices it.
  router.post('/pricing/calculate', readAccess, controller.calculatePricing);
  router.get('/:id', readAccess, controller.getById);
  router.patch('/:id', writeAccess, controller.update);
  router.delete('/:id', writeAccess, controller.delete);

  return router;
}
