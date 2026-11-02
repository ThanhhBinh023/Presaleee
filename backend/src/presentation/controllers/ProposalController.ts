import { Request, Response, NextFunction } from 'express';
import { CreateProposalUseCase } from '../../application/use-cases/CreateProposalUseCase.js';
import { GetProposalByIdUseCase } from '../../application/use-cases/GetProposalByIdUseCase.js';
import { ListProposalsUseCase } from '../../application/use-cases/ListProposalsUseCase.js';
import { UpdateProposalUseCase } from '../../application/use-cases/UpdateProposalUseCase.js';
import { UpdateProposalSheetUseCase } from '../../application/use-cases/UpdateProposalSheetUseCase.js';
import { DeleteProposalUseCase } from '../../application/use-cases/DeleteProposalUseCase.js';
import { ExportProposalToExcelUseCase } from '../../application/use-cases/ExportProposalToExcelUseCase.js';
import { GenerateProposalFromLeadUseCase } from '../../application/use-cases/GenerateProposalFromLeadUseCase.js';
import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';

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
    private readonly exportExcelUseCase: ExportProposalToExcelUseCase,
    private readonly generateFromLeadUseCase?: GenerateProposalFromLeadUseCase,
    private readonly proposalRepo?: IProposalRepository
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
      const proposal = await this.generateFromLeadUseCase.execute({
        leadId,
        customInstructions,
        userId: (req as any).user?.id || null
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
      if (this.proposalRepo) {
        const proposal = await this.proposalRepo.findByLeadId(leadId);
        res.status(200).json({
          success: true,
          data: proposal
        });
        return;
      }

      const listRes = await this.listUseCase.execute({ leadId, limit: 1 });
      const prop = listRes.proposals[0];
      if (!prop) {
        res.status(200).json({ success: true, data: null });
        return;
      }
      const full = await this.getByIdUseCase.execute(prop.id);
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
      const { status } = req.body;
      const updated = await this.updateUseCase.execute({ id, status });
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
      const id = getParam(req.params.id);
      const proposal = await this.getByIdUseCase.execute(id);
      const overviewSheet = proposal.sheets.find(s => s.sheetName === 'Overview');
      const brief = overviewSheet?.sheetData?.uiDesignBrief || {
        title: `Interactive UI/UX Design Brief cho ${proposal.title}`,
        target_users: ['Cán bộ Quản trị', 'Chuyên viên Vận hành', 'Khách hàng'],
        key_screens: ['Dashboard Tổng quan', 'Bản đồ / Phân hệ Dữ liệu Lõi', 'Báo cáo & Phân quyền'],
        ui_style_guide: 'Phong cách Enterprise hiện đại, gam màu Slate Navy & Emerald, chuẩn WCAG 2.1 AA.',
        interaction_flow: 'Đăng nhập định danh -> Bảng điều khiển -> Thao tác nghiệp vụ -> Phê duyệt & Xuất báo cáo.'
      };

      res.status(200).json({
        success: true,
        data: brief,
        message: 'AI UI Design Brief generated successfully.'
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
      const { page, limit, status, search, organizationId, leadId } = req.query;

      const result = await this.listUseCase.execute({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        status: status as string | undefined,
        search: search as string | undefined,
        organizationId: organizationId as string | undefined,
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

      const updated = await this.updateUseCase.execute({ id,
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
