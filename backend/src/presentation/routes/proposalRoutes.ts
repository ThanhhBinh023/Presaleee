import { Router } from 'express';
import { ProposalController } from '../controllers/ProposalController.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';

export function createProposalRouter(controller: ProposalController): Router {
  const router = Router();
  router.use(requireAuth, requireOrganization);

  router.get('/:id/export-pdf', controller.exportPdf);
  router.get('/:id/export-excel', controller.exportExcel);
  router.post('/:id/generate', controller.generateAll);
  router.post('/:id/sheets/:sheetName/generate', controller.generateSheet);
  router.post('/:id/sections/:sectionName/regenerate', controller.regenerateSection);
  router.post('/:id/submit-review', controller.submitForReview);

  // Proposal Sheets
  router.put('/:id/sheets/:sheetName', controller.updateSheet);

  // Proposal CRUD
  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.delete);

  return router;
}
