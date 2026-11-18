import { Router } from 'express';
import { LeadIntakeController } from '../controllers/LeadIntakeController.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';

export function createLeadIntakeRouter(controller: LeadIntakeController): Router {
  const router = Router();

  // List existing leads (strictly scoped to user's organization)
  router.get('/', requireAuth, requireOrganization, controller.listLeads);

  // Create a lead from the reviewed intake draft (allowed for all organization members)
  router.post('/', requireAuth, requireOrganization, controller.createLead);

  // Analyze RFP text and return an unsaved draft (open to all organization members)
  router.post('/intake/analyze', requireAuth, requireOrganization, controller.analyze);

  // Both spellings hit the same handler on purpose: `qualify` used to run its own prompt and store a
  // different JSON shape in bant_details, which left one column with two incompatible schemas.
  router.post('/:id/qualify', requireAuth, requireOrganization, controller.qualify);
  router.post('/:id/qualifications', requireAuth, requireOrganization, controller.qualify);

  // Get single lead (strictly scoped to user's organization)
  router.get('/:id', requireAuth, requireOrganization, controller.getLeadById);

  // Latest stored BANT result (strictly scoped to user's organization)
  router.get('/:id/qualifications/latest', requireAuth, requireOrganization, controller.latestQualification);

  // PBAC: Quản lý thành viên trong dự án (Project Memberships)
  router.get('/:id/members', requireAuth, requireOrganization, controller.listMembers);
  router.post('/:id/members', requireAuth, requireOrganization, controller.addMember);
  router.patch('/:id/members/:userId', requireAuth, requireOrganization, controller.updateMemberRole);
  router.delete('/:id/members/:userId', requireAuth, requireOrganization, controller.removeMember);

  // Update lead fields (strictly scoped to user's organization).
  // Rejects `status`: status changes only go through PATCH /:id/status, which enforces the state machine.
  router.patch('/:id', requireAuth, requireOrganization, controller.updateLead);
  router.put('/:id', requireAuth, requireOrganization, controller.updateLead);

  // Move a lead through the state machine
  router.patch('/:id/status', requireAuth, requireOrganization, controller.changeStatus);

  // Delete lead (strictly scoped to user's organization)
  router.delete('/:id', requireAuth, requireOrganization, controller.deleteLead);

  return router;
}
