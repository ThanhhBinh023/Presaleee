import { Router } from 'express';
import { LeadIntakeController } from '../controllers/LeadIntakeController.js';
import { requireAuth, requireOrganization, requireNotViewer } from '../middlewares/requireAuth.js';

export function createLeadIntakeRouter(controller: LeadIntakeController): Router {
  const router = Router();

  // List existing leads (strictly scoped to user's organization)
  router.get('/', requireAuth, requireOrganization, controller.listLeads);

  // Create a lead from the reviewed intake draft (prohibited for VIEWER)
  router.post('/', requireAuth, requireOrganization, requireNotViewer, controller.createLead);

  // Analyze RFP text and return an unsaved draft
  router.post('/intake/analyze', requireAuth, requireOrganization, requireNotViewer, controller.analyze);

  // Qualify lead with AI BANT evaluation
  router.post('/:id/qualify', requireAuth, requireOrganization, requireNotViewer, controller.qualify);

  // BANT scoring: reads the stored RFP, writes bant_score + bant_details, status -> QUALIFIED
  router.post('/:id/qualifications', requireAuth, requireOrganization, requireNotViewer, controller.qualifyBant);

  // Get single lead (strictly scoped to user's organization)
  router.get('/:id', requireAuth, requireOrganization, controller.getLeadById);

  // Update lead (prohibited for VIEWER, strictly scoped to user's organization)
  router.put('/:id', requireAuth, requireOrganization, requireNotViewer, controller.updateLead);

  // Delete lead (prohibited for VIEWER, strictly scoped to user's organization)
  router.delete('/:id', requireAuth, requireOrganization, requireNotViewer, controller.deleteLead);

  return router;
}
