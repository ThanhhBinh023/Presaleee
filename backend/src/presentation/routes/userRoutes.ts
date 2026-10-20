import { Router, RequestHandler } from 'express';
import { UserController } from '../controllers/UserController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { ORGANIZATION_ADMIN_ROLES } from '../../domain/entities/User.js';

export function createUserRouter(controller: UserController): Router {
  const router = Router();
  const adminAccess: RequestHandler[] = [requireAuth, requireRole(...ORGANIZATION_ADMIN_ROLES)];

  router.get('/me/organizations', requireAuth, controller.listOrganizations);
  router.patch('/me', requireAuth, controller.updateMe);
  router.get('/', requireAuth, controller.list);
  router.post('/', adminAccess, controller.add);
  router.get('/:id', requireAuth, controller.getById);
  router.patch('/:id', adminAccess, controller.updateMember);

  return router;
}
