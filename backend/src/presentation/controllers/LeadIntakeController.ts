import { Request, Response, NextFunction } from 'express';
import { AnalyzeLeadIntakeUseCase } from '../../application/use-cases/AnalyzeLeadIntakeUseCase.js';
import {
  CreateLeadUseCase,
  DeleteLeadUseCase,
  GetLatestQualificationUseCase,
  GetLeadUseCase,
  ListLeadsUseCase,
  QualifyLeadUseCase,
  UpdateLeadStatusUseCase,
  UpdateLeadUseCase
} from '../../application/use-cases/LeadUseCases.js';
import { UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';

function paramId(id: string | string[] | undefined): string {
  return Array.isArray(id) ? id[0] || '' : id || '';
}

export class LeadIntakeController {
  constructor(
    private readonly analyzeUseCase: AnalyzeLeadIntakeUseCase,
    private readonly createUseCase: CreateLeadUseCase,
    private readonly listUseCase: ListLeadsUseCase,
    private readonly getUseCase: GetLeadUseCase,
    private readonly updateUseCase: UpdateLeadUseCase,
    private readonly updateStatusUseCase: UpdateLeadStatusUseCase,
    private readonly deleteUseCase: DeleteLeadUseCase,
    private readonly qualifyUseCase: QualifyLeadUseCase,
    private readonly getLatestQualificationUseCase: GetLatestQualificationUseCase
  ) {}

  private scope(req: Request) {
    if (!req.auth?.sub) throw new UnauthorizedError();
    if (!req.auth.organizationId) throw new ValidationError('Authenticated organization is required.');
    return {
      organizationId: req.auth.organizationId,
      userId: req.auth.sub,
      claims: req.auth,
      ipAddress: req.socket.remoteAddress
    };
  }

  /** Request payload first, authenticated scope last: a body or query field can never move work into another tenant. */
  private scoped(req: Request, payload: Record<string, unknown>) {
    return { ...payload, ...this.scope(req) };
  }

  analyze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const { rawRfpContent, source } = body;
      this.scope(req);
      const result = await this.analyzeUseCase.execute({ rawRfpContent, source });

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          persisted: false,
          message: 'This is an unsaved Lead draft. Review it before persisting.'
        }
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lead = await this.createUseCase.execute(this.scoped(req, req.body || {}));
      res.status(201).location(`/api/v1/leads/${lead.id}`).json({ success: true, data: lead });
    } catch (error) { next(error); }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.listUseCase.execute(this.scoped(req, req.query as Record<string, unknown>));
      res.status(200).json({ success: true, data: result.leads, meta: {
        total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages
      } });
    } catch (error) { next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lead = await this.getUseCase.execute(paramId(req.params.id), this.scope(req).organizationId);
      res.status(200).json({ success: true, data: lead });
    } catch (error) { next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lead = await this.updateUseCase.execute({ ...this.scoped(req, req.body || {}), id: paramId(req.params.id) });
      res.status(200).json({ success: true, data: lead });
    } catch (error) { next(error); }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
      const lead = await this.updateStatusUseCase.execute(paramId(req.params.id), this.scope(req), body.status);
      res.status(200).json({ success: true, data: lead });
    } catch (error) { next(error); }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteUseCase.execute(paramId(req.params.id), this.scope(req));
      res.status(204).end();
    } catch (error) { next(error); }
  };

  qualify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const qualification = await this.qualifyUseCase.execute(paramId(req.params.id), this.scope(req));
      res.status(200).json({ success: true, data: qualification });
    } catch (error) { next(error); }
  };

  getLatestQualification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const qualification = await this.getLatestQualificationUseCase.execute(paramId(req.params.id), this.scope(req).organizationId);
      res.status(200).json({ success: true, data: qualification });
    } catch (error) { next(error); }
  };
}
