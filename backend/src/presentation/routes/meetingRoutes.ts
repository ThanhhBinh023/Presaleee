import { Router } from 'express';
import { MeetingController } from '../controllers/MeetingController.js';

export function createMeetingRouter(controller: MeetingController): Router {
  const router = Router();

  // Create meeting
  router.post('/', controller.create);

  // List meetings for a lead
  router.get('/lead/:leadId', controller.listByLead);

  // Inspect transcript with AI (Clean + Action Items + Follow-up questions)
  router.post('/:id/inspect', controller.inspect);

  // Update lifecycle (OPEN -> LOCKED -> INSPECTED -> REOPENED)
  router.patch('/:id/lifecycle', controller.updateLifecycle);

  // Single meeting CRUD
  router.get('/:id', controller.getById);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete);

  return router;
}
