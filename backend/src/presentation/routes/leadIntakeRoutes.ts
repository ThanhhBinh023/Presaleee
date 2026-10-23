import { Router } from 'express';
import { LeadIntakeController } from '../controllers/LeadIntakeController.js';

export function createLeadIntakeRouter(controller: LeadIntakeController): Router {
  const router = Router();

  // Analyze RFP text and return an unsaved, frontend-ready Lead draft.
  router.post('/intake/analyze', controller.analyze);

  return router;
}
