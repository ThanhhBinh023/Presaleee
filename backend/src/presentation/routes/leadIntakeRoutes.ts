import { Router } from 'express';
import { LeadIntakeController } from '../controllers/LeadIntakeController.js';

export function createLeadIntakeRouter(controller: LeadIntakeController): Router {
  const router = Router();

  // List existing leads
  router.get('/', controller.listLeads);

  // Analyze RFP text and persist as a lead
  router.post('/intake/analyze', controller.analyze);

  // Qualify lead with AI BANT evaluation
  router.post('/:id/qualify', controller.qualify);

  // Get single lead
  router.get('/:id', controller.getLeadById);

  return router;
}
