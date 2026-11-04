import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';

export function createDashboardRouter(controller: DashboardController): Router {
  const router = Router();
  router.use(requireAuth, requireOrganization);
  router.get('/overview', controller.overview);
  router.get('/leads', controller.leads);
  router.get('/activity', controller.activity);
  return router;
}
