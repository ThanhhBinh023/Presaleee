import { Request, Response, NextFunction } from 'express';
import { CreateProposalUseCase } from '../../application/use-cases/CreateProposalUseCase.js';
import { GetProposalByIdUseCase } from '../../application/use-cases/GetProposalByIdUseCase.js';
import { ListProposalsUseCase } from '../../application/use-cases/ListProposalsUseCase.js';
import { UpdateProposalUseCase } from '../../application/use-cases/UpdateProposalUseCase.js';
import { UpdateProposalSheetUseCase } from '../../application/use-cases/UpdateProposalSheetUseCase.js';
import { DeleteProposalUseCase } from '../../application/use-cases/DeleteProposalUseCase.js';
import { ExportProposalToExcelUseCase } from '../../application/use-cases/ExportProposalToExcelUseCase.js';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export class ProposalController {
  constructor(
    private readonly createUseCase: CreateProposalUseCase,
    private readonly getByIdUseCase: GetProposalByIdUseCase,
    private readonly listUseCase: ListProposalsUseCase,
    private readonly updateUseCase: UpdateProposalUseCase,
    private readonly updateSheetUseCase: UpdateProposalSheetUseCase,
    private readonly deleteUseCase: DeleteProposalUseCase,
    private readonly exportExcelUseCase: ExportProposalToExcelUseCase
  ) {}

  /**
   * POST /api/v1/proposals
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        title,
        organizationId,
        leadId,
        createdBy,
        version,
        currency,
        totalCost,
        estimatedTimelineWeeks,
        initialSheets
      } = req.body;

      const proposal = await this.createUseCase.execute({
        title,
        organizationId,
        leadId,
        createdBy,
        version,
        currency,
        totalCost,
        estimatedTimelineWeeks,
        initialSheets
      });

      res.status(201).json({
        success: true,
        data: proposal,
        message: 'Proposal created successfully with initial 10-sheet structure.'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/proposals/:id
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParam(req.params.id);
      const proposal = await this.getByIdUseCase.execute(id);

      res.status(200).json({
        success: true,
        data: proposal
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/proposals
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, status, search, organizationId } = req.query;

      const result = await this.listUseCase.execute({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        status: status as string | undefined,
        search: search as string | undefined,
        organizationId: organizationId as string | undefined
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
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/proposals/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParam(req.params.id);
      const {
        title,
        version,
        status,
        totalCost,
        currency,
        estimatedTimelineWeeks,
        exportExcelUrl
      } = req.body;

      const updated = await this.updateUseCase.execute({
        id,
        title,
        version,
        status,
        totalCost,
        currency,
        estimatedTimelineWeeks,
        exportExcelUrl
      });

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Proposal updated successfully.'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/proposals/:id/sheets/:sheetName
   */
  updateSheet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParam(req.params.id);
      const rawSheetName = getParam(req.params.sheetName);
      const { sheetData, aiGenerated } = req.body;

      const decodedSheetName = decodeURIComponent(rawSheetName);
      const updatedSheet = await this.updateSheetUseCase.execute({
        proposalId: id,
        sheetName: decodedSheetName,
        sheetData,
        aiGenerated
      });

      res.status(200).json({
        success: true,
        data: updatedSheet,
        message: `Sheet '${decodedSheetName}' updated successfully.`
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/proposals/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParam(req.params.id);
      await this.deleteUseCase.execute(id);

      res.status(200).json({
        success: true,
        message: `Proposal with ID '${id}' deleted successfully.`
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/proposals/:id/export-excel
   */
  exportExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParam(req.params.id);
      const result = await this.exportExcelUseCase.execute(id);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(result.filename)}"`
      );
      res.setHeader('Content-Length', result.buffer.length);

      res.status(200).end(result.buffer);
    } catch (error) {
      next(error);
    }
  };
}
