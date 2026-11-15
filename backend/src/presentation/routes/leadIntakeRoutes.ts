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

  // Both spellings hit the same handler on purpose: `qualify` used to run its own prompt and store a
  // different JSON shape in bant_details, which left one column with two incompatible schemas.
  router.post('/:id/qualify', requireAuth, requireOrganization, requireNotViewer, controller.qualify);
  router.post('/:id/qualifications', requireAuth, requireOrganization, requireNotViewer, controller.qualify);

  // Get single lead (strictly scoped to user's organization)
  router.get('/:id', requireAuth, requireOrganization, controller.getLeadById);

  // Latest stored BANT result (strictly scoped to user's organization)
  router.get('/:id/qualifications/latest', requireAuth, requireOrganization, controller.latestQualification);

  // Update lead fields (prohibited for VIEWER, strictly scoped to user's organization).
  // Rejects `status`: status changes only go through PATCH /:id/status, which enforces the state machine.
  router.patch('/:id', requireAuth, requireOrganization, requireNotViewer, controller.updateLead);
  router.put('/:id', requireAuth, requireOrganization, requireNotViewer, controller.updateLead);

  // Move a lead through the state machine (prohibited for VIEWER)
  router.patch('/:id/status', requireAuth, requireOrganization, requireNotViewer, controller.changeStatus);

  // Delete lead (prohibited for VIEWER, strictly scoped to user's organization)
  router.delete('/:id', requireAuth, requireOrganization, requireNotViewer, controller.deleteLead);

  return router;
}
