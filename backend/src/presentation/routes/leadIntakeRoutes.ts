import { Router } from 'express';
import { LeadIntakeController } from '../controllers/LeadIntakeController.js';
import { optionalAuth } from '../middlewares/requireAuth.js';

export function createLeadIntakeRouter(controller: LeadIntakeController): Router {
  const router = Router();

  // List existing leads (filtered by user/org if authenticated)
  router.get('/', optionalAuth, controller.listLeads);

  // Analyze RFP text and persist as a lead
  router.post('/intake/analyze', optionalAuth, controller.analyze);

  // Qualify lead with AI BANT evaluation
  router.post('/:id/qualify', optionalAuth, controller.qualify);

  // Get single lead
  router.get('/:id', optionalAuth, controller.getLeadById);

  return router;
}
