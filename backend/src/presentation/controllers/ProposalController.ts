import { Request, Response, NextFunction } from 'express';
import { AppError, UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';
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

function getParam(param: string | string[] | undefined): string {
  return Array.isArray(param) ? param[0] || '' : param || '';
}

function authContext(req: Request): { organizationId: string; userId: string } {
  if (!req.auth?.sub) throw new UnauthorizedError();
  if (!req.auth.organizationId) throw new AppError('An organization is required for this operation.', 403);
  return { organizationId: req.auth.organizationId, userId: req.auth.sub };
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
    private readonly exportPdfUseCase: ExportProposalToPdfUseCase
  ) {}

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
      const { organizationId } = authContext(req);
      const result = await this.listUseCase.execute({
        organizationId,
        page: req.query.page === undefined ? 1 : Number(req.query.page),
        limit: req.query.limit === undefined ? 20 : Number(req.query.limit),
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined
      });
      res.status(200).json({ success: true, data: result.proposals, meta: {
        total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages
      } });
    } catch (error) { next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context = authContext(req);
      const body = bodyObject(req);
      const updated = await this.updateUseCase.execute({
        id: getParam(req.params.id), organizationId: context.organizationId, actorId: context.userId, actorRole: req.auth?.role || 'VIEWER',
        title: typeof body.title === 'string' ? body.title : undefined,
        version: typeof body.version === 'string' ? body.version : undefined,
        status: typeof body.status === 'string' ? body.status as never : undefined,
        totalCost: typeof body.totalCost === 'number' || body.totalCost === null ? body.totalCost as number | null : undefined,
        currency: typeof body.currency === 'string' ? body.currency : undefined,
        estimatedTimelineWeeks: typeof body.estimatedTimelineWeeks === 'number' || body.estimatedTimelineWeeks === null ? body.estimatedTimelineWeeks as number | null : undefined,
        exportExcelUrl: typeof body.exportExcelUrl === 'string' || body.exportExcelUrl === null ? body.exportExcelUrl as string | null : undefined
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
