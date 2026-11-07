import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';
import { AuthenticatedScope } from '../../application/dtos/AuthenticatedScope.js';
import {
  CalculateQuotationPricingUseCase,
  CreateRateCardUseCase,
  DeleteRateCardUseCase,
  GetRateCardUseCase,
  ListRateCardsUseCase,
  UpdateRateCardUseCase
} from '../../application/use-cases/RateCardUseCases.js';

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function body(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new ValidationError('Request body must be a JSON object.');
  return req.body as Record<string, unknown>;
}

export class RateCardController {
  constructor(
    private readonly createUseCase: CreateRateCardUseCase,
    private readonly listUseCase: ListRateCardsUseCase,
    private readonly getUseCase: GetRateCardUseCase,
    private readonly updateUseCase: UpdateRateCardUseCase,
    private readonly deleteUseCase: DeleteRateCardUseCase,
    private readonly pricingUseCase: CalculateQuotationPricingUseCase
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

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rateCard = await this.createUseCase.execute(this.scope(req), body(req));
      res.status(201).location(`/api/v1/rate-cards/${rateCard.id}`).json({ success: true, data: rateCard });
    } catch (error) { next(error); }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.listUseCase.execute(this.scope(req), req.query as Record<string, unknown>);
      res.status(200).json({
        success: true,
        data: result.rateCards,
        meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages }
      });
    } catch (error) { next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rateCard = await this.getUseCase.execute(this.scope(req), routeParam(req, 'id'));
      res.status(200).json({ success: true, data: rateCard });
    } catch (error) { next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rateCard = await this.updateUseCase.execute(this.scope(req), routeParam(req, 'id'), body(req));
      res.status(200).json({ success: true, data: rateCard });
    } catch (error) { next(error); }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteUseCase.execute(this.scope(req), routeParam(req, 'id'));
      res.status(204).end();
    } catch (error) { next(error); }
  };

  calculatePricing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.pricingUseCase.execute(this.scope(req), body(req));
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  };
}
