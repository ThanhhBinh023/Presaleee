import { Router } from 'express';
import { MeetingController } from '../controllers/MeetingController.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';

export function createMeetingRouter(controller: MeetingController): Router {
  const router = Router();
  router.use(requireAuth, requireOrganization);

  // Support GET /meetings/lead/:leadId (DiscoveryMeetingsTab)
  router.get('/lead/:leadId', controller.listForLead);

  // Support POST /meetings with body { leadId, title, ... }
  router.post('/', (req, res, next) => {
    const bodyLeadId = (req.body as any)?.leadId;
    if (bodyLeadId && !(req.params as any).leadId) {
      (req.params as any).leadId = bodyLeadId;
    }
    return controller.createForLead(req, res, next);
  });

  router.get('/:meetingId', controller.get);
  router.post('/:meetingId/transcript', controller.saveTranscript);
  router.post('/:meetingId/analyze', controller.analyze);

  // Alias POST /:meetingId/inspect (used by DiscoveryMeetingsTab)
  router.post('/:meetingId/inspect', async (req, res, next) => {
    if (req.body?.rawTranscript) {
      try {
        const { organizationId } = (req as any).auth || {};
        await (controller as any).transcriptUseCase.execute(
          req.params.meetingId,
          organizationId,
          req.body.rawTranscript,
          false
        );
      } catch {
        // continue to analyze
      }
    }
    return controller.analyze(req, res, next);
  });

  // Alias PATCH /:meetingId/lifecycle and PUT /:meetingId
  router.patch('/:meetingId/lifecycle', controller.updateStatus);
  router.patch('/:meetingId/status', controller.updateStatus);
  router.put('/:meetingId', controller.saveTranscript);

  return router;
}
