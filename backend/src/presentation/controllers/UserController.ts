import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';
import { AuthenticatedScope } from '../../application/dtos/AuthenticatedScope.js';
import {
  AddMemberUseCase,
  GetMemberUseCase,
  ListMembersUseCase,
  ListOrganizationsUseCase,
  UpdateMemberUseCase,
  UpdateOwnProfileUseCase
} from '../../application/use-cases/UserUseCases.js';

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function body(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new ValidationError('Request body must be a JSON object.');
  return req.body as Record<string, unknown>;
}

export class UserController {
  constructor(
    private readonly listOrganizationsUseCase: ListOrganizationsUseCase,
    private readonly listMembersUseCase: ListMembersUseCase,
    private readonly getMemberUseCase: GetMemberUseCase,
    private readonly addMemberUseCase: AddMemberUseCase,
    private readonly updateMemberUseCase: UpdateMemberUseCase,
    private readonly updateProfileUseCase: UpdateOwnProfileUseCase
  ) {}

  private scope(req: Request): AuthenticatedScope {
    if (!req.auth?.sub) throw new UnauthorizedError();
    if (!req.auth.organizationId) throw new ValidationError('Authenticated organization is required.');
    return {
      organizationId: req.auth.organizationId,
      userId: req.auth.sub,
      role: req.auth.role,
      claims: req.auth,
      ipAddress: req.socket.remoteAddress
    };
  }

  listOrganizations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const organizations = await this.listOrganizationsUseCase.execute({
        organizationId: req.auth.organizationId || '', userId: req.auth.sub, role: req.auth.role, claims: req.auth
      });
      res.status(200).json({ success: true, data: organizations, meta: { total: organizations.length } });
    } catch (error) { next(error); }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.listMembersUseCase.execute(this.scope(req), req.query as Record<string, unknown>);
      res.status(200).json({
        success: true,
        data: result.members,
        meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages }
      });
    } catch (error) { next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const member = await this.getMemberUseCase.execute(this.scope(req), routeParam(req, 'id'));
      res.status(200).json({ success: true, data: member });
    } catch (error) { next(error); }
  };

  add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const member = await this.addMemberUseCase.execute(this.scope(req), body(req));
      res.status(201).location(`/api/v1/users/${member.id}`).json({ success: true, data: member });
    } catch (error) { next(error); }
  };

  updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const member = await this.updateMemberUseCase.execute(this.scope(req), routeParam(req, 'id'), body(req));
      res.status(200).json({ success: true, data: member });
    } catch (error) { next(error); }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.updateProfileUseCase.execute(this.scope(req), body(req));
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  };
}
