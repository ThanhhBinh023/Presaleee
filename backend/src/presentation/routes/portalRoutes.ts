import { Router, Request, Response, NextFunction } from 'express';
import { hashToken } from '../../application/services/AuthTokenService.js';
import { IPortalRepository } from '../../domain/repositories/IPortalRepository.js';
import { UnauthorizedError } from '../../domain/errors/AppError.js';
import { PortalController } from '../controllers/PortalController.js';
import { requireAuth, requireOrganization } from '../middlewares/requireAuth.js';

function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export function createPortalRouter(controller: PortalController, portalRepository: IPortalRepository): Router {
  const router = Router();
  router.post('/sessions', requireAuth, requireOrganization, controller.createSession);
  router.delete('/sessions/:sessionId', requireAuth, requireOrganization, controller.revokeSession);
  router.use('/proposals/:proposalId', async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authorization = req.header('authorization');
      const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
      if (!token) throw new UnauthorizedError('Client portal access token is required.');
      const proposalId = param(req, 'proposalId');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(proposalId)) {
        throw new UnauthorizedError('Client portal session is invalid or expired.');
      }
      const session = await portalRepository.findActiveSession(hashToken(token), proposalId);
      if (!session) throw new UnauthorizedError('Client portal session is invalid or expired.');
      req.portalSession = session;
      next();
    } catch (error) { next(error); }
  });
  router.get('/proposals/:proposalId', controller.getProposal);
  router.post('/proposals/:proposalId/questions', controller.ask);
  router.get('/proposals/:proposalId/comments', controller.listComments);
  router.post('/proposals/:proposalId/comments', controller.createComment);
  router.get('/proposals/:proposalId/materials', controller.listMaterials);
  router.get('/proposals/:proposalId/export-pdf', controller.exportPdf);
  return router;
}
