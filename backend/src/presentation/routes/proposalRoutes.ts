import { Router } from 'express';
import { ProposalController } from '../controllers/ProposalController.js';
import { requireAuth, requireOrganization, requireNotViewer } from '../middlewares/requireAuth.js';

export function createProposalRouter(controller: ProposalController): Router {
  const router = Router();
  router.use(requireAuth, requireOrganization);

  // Excel & PDF Export endpoints (read-only for all authenticated org members including VIEWER)
  router.get('/:id/export-excel', controller.exportExcel);
  router.get('/:id/export-pdf', controller.exportPdf);

  // Mutating endpoints (prohibited for VIEWER)
  router.post('/:id/generate', requireNotViewer, controller.generateAll);
  router.post('/:id/sheets/:sheetName/generate', requireNotViewer, controller.generateSheet);
  router.post('/:id/sections/:sectionName/regenerate', requireNotViewer, controller.regenerateSection);
  router.post('/:id/submit-review', requireNotViewer, controller.submitForReview);

  // Generate proposal dynamically from Lead Context using AI RAG
  router.post('/generate-from-lead', requireNotViewer, controller.generateFromLead);

  // Get proposal by leadId (read-only)
  router.get('/lead/:leadId', controller.getByLeadId);

  // Proposal Sheets update
  router.put('/:id/sheets/:sheetName', requireNotViewer, controller.updateSheet);

  // Lifecycle updates (DRAFT -> IN_REVIEW -> APPROVED)
  router.patch('/:id/lifecycle', requireNotViewer, controller.updateLifecycle);

  // Generate AI UI Design Brief
  router.post('/:id/ui-brief', requireNotViewer, controller.generateUIDesignBrief);

  // Proposal CRUD
  router.post('/', requireNotViewer, controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.patch('/:id', requireNotViewer, controller.update);
  router.delete('/:id', requireNotViewer, controller.delete);

  return router;
}
