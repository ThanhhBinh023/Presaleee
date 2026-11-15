import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';
import { CreateProposalUseCase } from '../../application/use-cases/CreateProposalUseCase.js';
import { CreateProposalFromLeadUseCase } from '../../application/use-cases/CreateProposalFromLeadUseCase.js';
import { GetProposalByIdUseCase } from '../../application/use-cases/GetProposalByIdUseCase.js';
import { ListProposalsUseCase } from '../../application/use-cases/ListProposalsUseCase.js';
import { UpdateProposalUseCase } from '../../application/use-cases/UpdateProposalUseCase.js';
import { UpdateProposalSheetUseCase } from '../../application/use-cases/UpdateProposalSheetUseCase.js';
import { DeleteProposalUseCase } from '../../application/use-cases/DeleteProposalUseCase.js';
import { ExportProposalToExcelUseCase } from '../../application/use-cases/ExportProposalToExcelUseCase.js';
import { GenerateProposalSheetsUseCase } from '../../application/use-cases/GenerateProposalSheetsUseCase.js';
import { ExportProposalToPdfUseCase } from '../../application/use-cases/ExportProposalToPdfUseCase.js';
import { SubmitProposalForReviewUseCase } from '../../application/use-cases/SubmitProposalForReviewUseCase.js';
import { GenerateProposalFromLeadUseCase } from '../../application/use-cases/GenerateProposalFromLeadUseCase.js';
import { GenerateUIDesignBriefUseCase } from '../../application/use-cases/GenerateUIDesignBriefUseCase.js';
import { UserRole } from '../../domain/entities/AuthUser.js';

function getParam(param: string | string[] | undefined): string {
  return Array.isArray(param) ? param[0] || '' : param || '';
}

function authContext(req: Request): { organizationId: string; userId: string; role: UserRole } {
  if (!req.auth?.sub) throw new UnauthorizedError();
  if (!req.auth.organizationId) throw new ForbiddenError('An organization is required for this operation.');
  return { organizationId: req.auth.organizationId, userId: req.auth.sub, role: req.auth.role };
}

function bodyObject(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new ValidationError('Request body must be a JSON object.');
  return req.body as Record<string, unknown>;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string.`);
  return value;
}

/** RFC 5987/6266: legacy clients read the ASCII name, modern clients read the UTF-8 filename*. */
function contentDisposition(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const extension = dot >= 0 ? filename.slice(dot) : '';
  const ascii = filename.replace(/[^\x20-\x7E]/g, '').replace(/["\\]/g, '') || `proposal${extension}`;
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export class ProposalController {
  constructor(
    private readonly createUseCase: CreateProposalUseCase,
    private readonly createFromLeadUseCase: CreateProposalFromLeadUseCase,
    private readonly getByIdUseCase: GetProposalByIdUseCase,
    private readonly listUseCase: ListProposalsUseCase,
    private readonly updateUseCase: UpdateProposalUseCase,
    private readonly updateSheetUseCase: UpdateProposalSheetUseCase,
    private readonly deleteUseCase: DeleteProposalUseCase,
    private readonly exportExcelUseCase: ExportProposalToExcelUseCase,
    private readonly generateSheetsUseCase: GenerateProposalSheetsUseCase,
    private readonly exportPdfUseCase: ExportProposalToPdfUseCase,
    private readonly submitForReviewUseCase: SubmitProposalForReviewUseCase,
    private readonly generateFromLeadUseCase?: GenerateProposalFromLeadUseCase,
    private readonly generateUiBriefUseCase?: GenerateUIDesignBriefUseCase
  ) {}

  /**
   * POST /api/v1/proposals/generate-from-lead
   */
  generateFromLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.generateFromLeadUseCase) {
        res.status(501).json({ success: false, error: 'GenerateFromLeadUseCase not configured.' });
        return;
      }
      const { leadId, customInstructions } = req.body;
      const { organizationId, userId } = authContext(req);
      const proposal = await this.generateFromLeadUseCase.execute({
        leadId,
        organizationId,
        customInstructions,
        userId
      });

      res.status(200).json({
        success: true,
        data: proposal,
        message: 'Proposal generated successfully from Lead context with 10 standard sheets.'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/proposals/lead/:leadId
   */
  getByLeadId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = getParam(req.params.leadId);
      const { organizationId } = authContext(req);
      const listRes = await this.listUseCase.execute({ leadId, organizationId, limit: 1 });
      const prop = listRes.proposals[0];
      if (!prop) {
        res.status(200).json({ success: true, data: null });
        return;
      }
      const full = await this.getByIdUseCase.execute(prop.id, organizationId);
      res.status(200).json({ success: true, data: full });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/proposals/:id/lifecycle
   */
  updateLifecycle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParam(req.params.id);
      const { organizationId, userId, role } = authContext(req);
      const { status } = req.body;
      const updated = await this.updateUseCase.execute({
        id,
        organizationId,
        actorId: userId,
        actorRole: role,
        status
      });
      res.status(200).json({
        success: true,
        data: updated,
        message: `Proposal status updated to ${status}.`
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/proposals/:id/ui-brief
   */
  generateUIDesignBrief = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.generateUiBriefUseCase) {
        res.status(501).json({ success: false, error: 'GenerateUIDesignBriefUseCase not configured.' });
        return;
      }
      const { organizationId } = authContext(req);
      const { brief, source } = await this.generateUiBriefUseCase.execute(getParam(req.params.id), organizationId);

      res.status(200).json({
        success: true,
        data: brief,
        meta: { source },
        message: source === 'ai'
          ? 'UI design brief generated by the AI service.'
          : 'UI design brief read from the proposal Overview sheet.'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/proposals
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context = authContext(req);
      const body = bodyObject(req);
      if (typeof body.title !== 'string') throw new ValidationError('Proposal title is required.');
      const proposal = await this.createUseCase.execute({
        title: body.title,
        organizationId: context.organizationId,
        createdBy: context.userId,
        version: typeof body.version === 'string' ? body.version : undefined,
        currency: typeof body.currency === 'string' ? body.currency : undefined,
        totalCost: typeof body.totalCost === 'number' ? body.totalCost : undefined,
        estimatedTimelineWeeks: typeof body.estimatedTimelineWeeks === 'number' ? body.estimatedTimelineWeeks : undefined,
        initialSheets: Array.isArray(body.initialSheets) ? body.initialSheets as never : undefined
      });
      res.status(201).location(`/api/v1/proposals/${proposal.id}`).json({ success: true, data: proposal });
    } catch (error) { next(error); }
  };

  createFromLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context = authContext(req);
      const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
      const proposal = await this.createFromLeadUseCase.execute(getParam(req.params.leadId), context.organizationId, context.userId, optionalString(body.title, 'title'));
      res.status(201).location(`/api/v1/proposals/${proposal.id}`).json({ success: true, data: proposal });
    } catch (error) { next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = authContext(req);
      const proposal = await this.getByIdUseCase.execute(getParam(req.params.id), organizationId);
      res.status(200).json({ success: true, data: proposal });
    } catch (error) { next(error); }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, status, search, leadId } = req.query;
      const { organizationId } = authContext(req);

      const result = await this.listUseCase.execute({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        status: status as string | undefined,
        search: search as string | undefined,
        organizationId,
        leadId: leadId as string | undefined
      });

      res.status(200).json({
        success: true,
        data: result.proposals,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) { next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParam(req.params.id);
      const { organizationId, userId, role } = authContext(req);
      const {
        title,
        version,
        status,
        totalCost,
        currency,
        estimatedTimelineWeeks,
        exportExcelUrl
      } = req.body;

      const updated = await this.updateUseCase.execute({ id,
        organizationId,
        actorId: userId,
        actorRole: role,
        title,
        version,
        status,
        totalCost,
        currency,
        estimatedTimelineWeeks,
        exportExcelUrl
      });
      res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
  };

  updateSheet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = authContext(req);
      const body = bodyObject(req);
      const sheetName = decodeURIComponent(getParam(req.params.sheetName));
      const updatedSheet = await this.updateSheetUseCase.execute({
        proposalId: getParam(req.params.id), organizationId, sheetName,
        sheetData: body.sheetData as Record<string, unknown>, aiGenerated: false
      });
      res.status(200).json({ success: true, data: updatedSheet });
    } catch (error) { next(error); }
  };

  generateAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = authContext(req);
      const body = bodyObject(req);
      const result = await this.generateSheetsUseCase.execute({
        proposalId: getParam(req.params.id), organizationId,
        sheetNames: body.sheetNames, instructions: body.instructions
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  };

  generateSheet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = authContext(req);
      const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
      const sheetName = decodeURIComponent(getParam(req.params.sheetName));
      const result = await this.generateSheetsUseCase.execute({
        proposalId: getParam(req.params.id), organizationId,
        sheetNames: [sheetName], instructions: body.instructions
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  };

  regenerateSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = authContext(req);
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? req.body as Record<string, unknown> : {};
      const sectionName = decodeURIComponent(getParam(req.params.sectionName));
      const result = await this.generateSheetsUseCase.execute({
        proposalId: getParam(req.params.id), organizationId,
        sheetNames: [sectionName], instructions: body.instructions
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  };

  submitForReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, userId } = authContext(req);
      const proposal = await this.submitForReviewUseCase.execute(getParam(req.params.id), organizationId, userId);
      res.status(200).json({ success: true, data: proposal });
    } catch (error) { next(error); }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = authContext(req);
      await this.deleteUseCase.execute(getParam(req.params.id), organizationId);
      res.status(204).end();
    } catch (error) { next(error); }
  };

  exportExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = authContext(req);
      // An export is read-only: a lead id that has no proposal answers 404 instead of generating one.
      const result = await this.exportExcelUseCase.execute(getParam(req.params.id), organizationId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', contentDisposition(result.filename));
      res.setHeader('Content-Length', result.buffer.length);
      res.status(200).end(result.buffer);
    } catch (error) { next(error); }
  };

  exportPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = authContext(req);
      const result = await this.exportPdfUseCase.execute(getParam(req.params.id), organizationId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', contentDisposition(result.filename));
      res.setHeader('Content-Length', result.buffer.length);
      res.status(200).end(result.buffer);
    } catch (error) { next(error); }
  };
}
