import { Router, RequestHandler } from 'express';
import { ClientController } from '../controllers/ClientController.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { ORGANIZATION_ADMIN_ROLES } from '../../domain/entities/User.js';

export function createClientRouter(controller: ClientController): Router {
  const router = Router();
  const writeAccess: RequestHandler[] = [requireAuth, requireOrganization, requireRole(...ORGANIZATION_ADMIN_ROLES)];

  router.get('/', requireAuth, requireOrganization, controller.list);
  router.post('/', ...writeAccess, controller.create);
  router.get('/:id', requireAuth, requireOrganization, controller.getById);
  router.get('/:id/leads', requireAuth, requireOrganization, controller.listLeads);
  router.patch('/:id', ...writeAccess, controller.update);
  router.delete('/:id', ...writeAccess, controller.delete);

  return router;
}
