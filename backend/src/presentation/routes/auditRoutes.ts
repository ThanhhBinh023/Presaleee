import { Router, RequestHandler } from 'express';
import { AuditController } from '../controllers/AuditController.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { ORGANIZATION_ADMIN_ROLES } from '../../domain/entities/User.js';

export function createAuditRouter(controller: AuditController): Router {
  const router = Router();
  const readAccess: RequestHandler[] = [requireAuth, requireOrganization, requireRole(...ORGANIZATION_ADMIN_ROLES)];
  router.get('/', readAccess, controller.list);
  return router;
}
