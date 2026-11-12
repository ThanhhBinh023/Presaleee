import { Router } from 'express';
import { ProposalController } from '../controllers/ProposalController.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';

export function createProposalRouter(controller: ProposalController): Router {
  const router = Router();
  router.use(requireAuth, requireOrganization);

  // Excel Export endpoint (must be before :id if matched specifically)
  router.get('/:id/export-excel', controller.exportExcel);
  router.get('/:id/export-pdf', controller.exportPdf);
  router.post('/:id/generate', controller.generateAll);
  router.post('/:id/sheets/:sheetName/generate', controller.generateSheet);
  router.post('/:id/sections/:sectionName/regenerate', controller.regenerateSection);
  router.post('/:id/submit-review', controller.submitForReview);

  // Generate proposal dynamically from Lead Context using AI RAG
  router.post('/generate-from-lead', controller.generateFromLead);

  // Get proposal by leadId
  router.get('/lead/:leadId', controller.getByLeadId);

  // Proposal Sheets update
  router.put('/:id/sheets/:sheetName', controller.updateSheet);

  // Lifecycle updates (DRAFT -> IN_REVIEW -> APPROVED)
  router.patch('/:id/lifecycle', controller.updateLifecycle);

  // Generate AI UI Design Brief
  router.post('/:id/ui-brief', controller.generateUIDesignBrief);

  // Proposal CRUD
  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.delete);

  return router;
}
