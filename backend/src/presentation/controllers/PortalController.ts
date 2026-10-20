import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../../domain/errors/AppError.js';
import { PortalSession } from '../../domain/entities/Portal.js';
import {
  AskPortalProposalUseCase, CreatePortalCommentUseCase, CreatePortalSessionUseCase,
  CreatePortalMaterialUseCase, DeletePortalMaterialUseCase,
  ExportPortalProposalPdfUseCase, GetPortalProposalUseCase, ListPortalCommentsUseCase,
  ListPortalMaterialsUseCase, RevokePortalSessionUseCase,
  ListProposalPortalSessionsUseCase, ListProposalPortalMaterialsUseCase
} from '../../application/use-cases/PortalUseCases.js';

declare global {
  namespace Express {
    interface Request { portalSession?: PortalSession; }
  }
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] || '' : value || '';
}
function objectBody(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new ValidationError('Request body must be a JSON object.');
  return req.body as Record<string, unknown>;
}
function portalSession(req: Request): PortalSession {
  if (!req.portalSession) throw new AppError('A valid client portal session is required.', 401);
  return req.portalSession;
}

export class PortalController {
  constructor(
    private readonly createSessionUseCase: CreatePortalSessionUseCase,
    private readonly getProposalUseCase: GetPortalProposalUseCase,
    private readonly askUseCase: AskPortalProposalUseCase,
    private readonly listCommentsUseCase: ListPortalCommentsUseCase,
    private readonly createCommentUseCase: CreatePortalCommentUseCase,
    private readonly listMaterialsUseCase: ListPortalMaterialsUseCase,
    private readonly exportPdfUseCase: ExportPortalProposalPdfUseCase,
    private readonly revokeSessionUseCase: RevokePortalSessionUseCase,
    private readonly createMaterialUseCase: CreatePortalMaterialUseCase,
    private readonly deleteMaterialUseCase: DeletePortalMaterialUseCase,
    private readonly listSessionsUseCase: ListProposalPortalSessionsUseCase,
    private readonly listMaterialsStaffUseCase: ListProposalPortalMaterialsUseCase
  ) {}

  createSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new AppError('Authentication required.', 401);
      if (!req.auth.organizationId) throw new AppError('An organization is required.', 403);
      const body = objectBody(req);
      const session = await this.createSessionUseCase.execute({
        proposalId: typeof body.proposalId === 'string' ? body.proposalId : '',
        organizationId: req.auth.organizationId, userId: req.auth.sub, role: req.auth.role,
        clientEmail: body.clientEmail, clientName: body.clientName, expiresInHours: body.expiresInHours
      });
      res.status(201).json({ success: true, data: session });
    } catch (error) { next(error); }
  };

  revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub || !req.auth.organizationId) throw new AppError('Authenticated user and organization are required.', 403);
      await this.revokeSessionUseCase.execute(routeParam(req, 'sessionId'), req.auth.organizationId, req.auth.sub, req.auth.role);
      res.status(204).end();
    } catch (error) { next(error); }
  };

  createMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub || !req.auth.organizationId) throw new AppError('Authenticated user and organization are required.', 403);
      const body = objectBody(req);
      const material = await this.createMaterialUseCase.execute({
        proposalId: routeParam(req, 'proposalId'), organizationId: req.auth.organizationId,
        actorId: req.auth.sub, role: req.auth.role, title: body.title, description: body.description,
        fileName: body.fileName, fileUrl: body.fileUrl, mimeType: body.mimeType, isShared: body.isShared
      });
      res.status(201).json({ success: true, data: material });
    } catch (error) { next(error); }
  };

  deleteMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.organizationId) throw new AppError('Authenticated organization is required.', 403);
      await this.deleteMaterialUseCase.execute({
        proposalId: routeParam(req, 'proposalId'), materialId: routeParam(req, 'materialId'),
        organizationId: req.auth.organizationId, role: req.auth.role
      });
      res.status(204).end();
    } catch (error) { next(error); }
  };

  getProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = portalSession(req);
      const proposal = await this.getProposalUseCase.execute(routeParam(req, 'proposalId'), session.organizationId);
      res.status(200).json({ success: true, data: proposal });
    } catch (error) { next(error); }
  };

  ask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = portalSession(req);
      const body = objectBody(req);
      const answer = await this.askUseCase.execute(routeParam(req, 'proposalId'), session.organizationId, body.question);
      res.status(200).json({ success: true, data: answer });
    } catch (error) { next(error); }
  };

  listComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = portalSession(req);
      const comments = await this.listCommentsUseCase.execute(routeParam(req, 'proposalId'), session.organizationId);
      res.status(200).json({ success: true, data: comments, meta: { total: comments.length } });
    } catch (error) { next(error); }
  };

  createComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = portalSession(req);
      const body = objectBody(req);
      const comment = await this.createCommentUseCase.execute({
        proposalId: routeParam(req, 'proposalId'), organizationId: session.organizationId,
        session, authorName: body.authorName, body: body.body
      });
      res.status(201).json({ success: true, data: comment });
    } catch (error) { next(error); }
  };

  listMaterials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = portalSession(req);
      const materials = await this.listMaterialsUseCase.execute(routeParam(req, 'proposalId'), session.organizationId);
      res.status(200).json({ success: true, data: materials, meta: { total: materials.length } });
    } catch (error) { next(error); }
  };

  listProposalSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.organizationId) throw new AppError('Authenticated organization is required.', 403);
      const sessions = await this.listSessionsUseCase.execute(routeParam(req, 'proposalId'), req.auth.organizationId);
      res.status(200).json({ success: true, data: sessions, meta: { total: sessions.length } });
    } catch (error) { next(error); }
  };

  listProposalMaterials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.organizationId) throw new AppError('Authenticated organization is required.', 403);
      const materials = await this.listMaterialsStaffUseCase.execute(routeParam(req, 'proposalId'), req.auth.organizationId);
      res.status(200).json({ success: true, data: materials, meta: { total: materials.length } });
    } catch (error) { next(error); }
  };

  exportPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = portalSession(req);
      const result = await this.exportPdfUseCase.execute(routeParam(req, 'proposalId'), session.organizationId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
      res.setHeader('Content-Length', result.buffer.length);
      res.status(200).end(result.buffer);
    } catch (error) { next(error); }
  };
}
