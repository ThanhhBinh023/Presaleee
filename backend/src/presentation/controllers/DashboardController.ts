import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../domain/errors/AppError.js';
import { GetDashboardOverviewUseCase, ListDashboardActivityUseCase, ListDashboardLeadsUseCase } from '../../application/use-cases/DashboardUseCases.js';

function organizationId(req: Request): string {
  if (!req.auth?.organizationId) throw new UnauthorizedError('Authenticated organization is required.');
  return req.auth.organizationId;
}

/** Query strings arrive unshaped; only scalars are forwarded so the use case can reject garbage with 400. */
function queryScalar(value: unknown): string | number | undefined {
  if (value === undefined || value === null) return undefined;
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' || typeof first === 'number' ? first : String(first);
}

/** Mirrors the use case default so the echoed meta limit matches the rows actually returned. */
function requestedLimit(value: string | number | undefined): number | undefined {
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
      const data = await this.overviewUseCase.execute(organizationId(req), queryScalar(req.query.leadLimit));
      res.status(200).json({ success: true, data });
    } catch (error) { next(error); }
  };

  leads = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requested = queryScalar(req.query.limit);
      const limit = requestedLimit(requested) ?? 20;
      const data = await this.leadsUseCase.execute(organizationId(req), requested);
      res.status(200).json({ success: true, data, meta: { total: data.length, limit } });
    } catch (error) { next(error); }
  };

  activity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requested = queryScalar(req.query.limit);
      const limit = requestedLimit(requested) ?? 20;
      const data = await this.activityUseCase.execute(organizationId(req), requested);
      res.status(200).json({ success: true, data, meta: { total: data.length, limit } });
    } catch (error) { next(error); }
  };
}
