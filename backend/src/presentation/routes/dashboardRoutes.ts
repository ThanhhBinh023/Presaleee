import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';

export function createDashboardRouter(controller: DashboardController): Router {
  const router = Router();
  router.use(requireAuth, requireOrganization);
  router.get('/overview', controller.overview);
  router.get('/leads', controller.leads);
  router.get('/activity', controller.activity);
  router.get('/admin-analytics', controller.adminAnalytics);
  router.get('/admin/export-excel', controller.exportExcel);
  router.get('/admin/export-pdf', controller.exportPdf);
  return router;
}
