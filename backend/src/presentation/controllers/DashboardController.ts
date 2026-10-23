import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../domain/errors/AppError.js';
import { GetDashboardOverviewUseCase, ListDashboardActivityUseCase, ListDashboardLeadsUseCase } from '../../application/use-cases/DashboardUseCases.js';

function organizationId(req: Request): string {
  if (!req.auth?.organizationId) throw new ValidationError('Authenticated organization is required.');
  return req.auth.organizationId;
}

function requestedLimit(value: unknown): number | undefined {
  if (value === undefined || value === '') return undefined;
  return Number(value);
}

export class DashboardController {
  constructor(
    private readonly overviewUseCase: GetDashboardOverviewUseCase,
    private readonly leadsUseCase: ListDashboardLeadsUseCase,
    private readonly activityUseCase: ListDashboardActivityUseCase
  ) {}

  overview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.overviewUseCase.execute(organizationId(req), req.query.leadLimit);
      res.status(200).json({ success: true, data });
    } catch (error) { next(error); }
  };

  leads = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = requestedLimit(req.query.limit) ?? 20;
      const data = await this.leadsUseCase.execute(organizationId(req), req.query.limit);
      res.status(200).json({ success: true, data, meta: { total: data.length, limit } });
    } catch (error) { next(error); }
  };

  activity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = requestedLimit(req.query.limit) ?? 20;
      const data = await this.activityUseCase.execute(organizationId(req), req.query.limit);
      res.status(200).json({ success: true, data, meta: { total: data.length, limit } });
    } catch (error) { next(error); }
  };
}
