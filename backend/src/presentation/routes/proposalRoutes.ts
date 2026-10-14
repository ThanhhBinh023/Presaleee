import { Router } from 'express';
import { ProposalController } from '../controllers/ProposalController.js';

export function createProposalRouter(controller: ProposalController): Router {
  const router = Router();

  // Excel Export endpoint (place before :id if needed, but :id/export-excel is distinct)
  router.get('/:id/export-excel', controller.exportExcel);

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
