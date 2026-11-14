import { Router } from 'express';
import { MeetingController } from '../controllers/MeetingController.js';
import { requireAuth, requireOrganization, requireNotViewer } from '../middlewares/requireAuth.js';

export function createMeetingRouter(controller: MeetingController): Router {
  const router = Router();
  router.use(requireAuth, requireOrganization);
  router.get('/:meetingId', controller.get);
  router.post('/:meetingId/transcript', requireNotViewer, controller.saveTranscript);
  router.post('/:meetingId/analyze', requireNotViewer, controller.analyze);
  router.patch('/:meetingId/status', requireNotViewer, controller.updateStatus);
  return router;
}
