import { Router } from 'express';
import { LeadIntakeController } from '../controllers/LeadIntakeController.js';
import { optionalAuth, requireAuth, requireOrganization } from '../middlewares/requireAuth.js';

export function createLeadIntakeRouter(controller: LeadIntakeController): Router {
  const router = Router();

  // List existing leads (filtered by user/org if authenticated)
  router.get('/', optionalAuth, controller.listLeads);

  // Create a lead from the reviewed intake draft — the only writer of new leads
  router.post('/', requireAuth, requireOrganization, controller.createLead);

  // Analyze RFP text and return an unsaved draft; saving happens on POST /
  router.post('/intake/analyze', optionalAuth, controller.analyze);

  // Qualify lead with AI BANT evaluation
  router.post('/:id/qualify', optionalAuth, controller.qualify);

  // BANT scoring: reads the stored RFP, writes bant_score + bant_details, status -> QUALIFIED
  router.post('/:id/qualifications', requireAuth, requireOrganization, controller.qualifyBant);

  // Get single lead
  router.get('/:id', optionalAuth, controller.getLeadById);

  // Update lead
  router.put('/:id', optionalAuth, controller.updateLead);

  // Delete lead
  router.delete('/:id', optionalAuth, controller.deleteLead);

  return router;
}
