import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';
import { AuthenticatedScope } from '../../application/dtos/AuthenticatedScope.js';
import { ListAuditLogsUseCase } from '../../application/use-cases/AuditUseCases.js';

export class AuditController {
  constructor(private readonly listUseCase: ListAuditLogsUseCase) {}

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

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.listUseCase.execute(this.scope(req), req.query as Record<string, unknown>);
      res.status(200).json({
        success: true,
        data: result.entries,
        meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages }
      });
    } catch (error) { next(error); }
  };
}
