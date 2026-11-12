import { Router } from 'express';
import { MeetingController } from '../controllers/MeetingController.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';

export function createMeetingRouter(controller: MeetingController): Router {
  const router = Router();
  router.use(requireAuth, requireOrganization);
  router.get('/:meetingId', controller.get);
  router.post('/:meetingId/transcript', controller.saveTranscript);
  router.post('/:meetingId/analyze', controller.analyze);
  router.patch('/:meetingId/status', controller.updateStatus);
  return router;
}
