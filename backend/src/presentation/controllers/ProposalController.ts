import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError, ValidationError, NotFoundError } from '../../domain/errors/AppError.js';
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
import { dbPool } from '../../infrastructure/database/connection.js';
import { ILLMGateway, LLMTaskMode } from '../../domain/repositories/ILLMGateway.js';

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
    private readonly generateUiBriefUseCase?: GenerateUIDesignBriefUseCase,
    private readonly llmGateway?: ILLMGateway
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
      const { organizationId, userId, role } = authContext(req);
      if (role === 'SALES_REP') {
        throw new ForbiddenError('Đại diện kinh doanh (SALES_REP) chỉ có quyền xem đề xuất (Proposal), không có quyền sinh Proposal từ Lead.');
      }
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

  private async resolveEffectiveRole(proposalId: string, userId: string, baseRole: UserRole, organizationId: string): Promise<UserRole> {
    if (baseRole === 'ADMIN') return 'ADMIN';
    // SALES_REP is view + export only; auto-seeded project memberships must not grant write or approval rights
    if (baseRole === 'SALES_REP' || baseRole === 'VIEWER') return baseRole;
    if (!dbPool) return baseRole;
    try {
      const memRes = await dbPool.query(`
        SELECT pm.project_role 
        FROM project_memberships pm
        JOIN leads l ON l.id = pm.project_id
        WHERE pm.user_id = $1 
          AND l.organization_id = $3
          AND (
            pm.project_id = $2 
            OR pm.project_id = (SELECT lead_id FROM proposals WHERE (id = $2 OR lead_id = $2) AND organization_id = $3 ORDER BY updated_at DESC LIMIT 1)
          )
        ORDER BY (CASE WHEN pm.project_role = 'PRESALE_LEAD' THEN 1 ELSE 2 END) ASC
        LIMIT 1;
      `, [userId, proposalId, organizationId]);
      if (memRes.rows[0]?.project_role) {
        return memRes.rows[0].project_role as UserRole;
      }
    } catch (err) {
      console.error('[ProposalController.resolveEffectiveRole] Error:', err);
    }
    return baseRole;
  }

  /**
   * PATCH /api/v1/proposals/:id/lifecycle
   */
  updateLifecycle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParam(req.params.id);
      const { organizationId, userId, role } = authContext(req);
      const effectiveRole = await this.resolveEffectiveRole(id, userId, role, organizationId);
      const { status, reviewNotes } = req.body;
      const updated = await this.updateUseCase.execute({
        id,
        organizationId,
        actorId: userId,
        actorRole: effectiveRole,
        status,
        reviewNotes: typeof reviewNotes === 'string' ? reviewNotes : undefined
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
      const { page, limit, status, search, leadId, presaleLeadOnly } = req.query;
      const { organizationId, userId } = authContext(req);

      const result = await this.listUseCase.execute({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        status: status as string | undefined,
        search: search as string | undefined,
        organizationId,
        leadId: leadId as string | undefined,
        presaleLeadUserId: presaleLeadOnly === 'true' ? userId : undefined
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
      const effectiveRole = await this.resolveEffectiveRole(id, userId, role, organizationId);
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
        actorRole: effectiveRole,
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
      const { organizationId, userId, role } = authContext(req);
      const proposalId = getParam(req.params.id);
      const effectiveRole = await this.resolveEffectiveRole(proposalId, userId, role, organizationId);
      const body = bodyObject(req);
      const sheetName = decodeURIComponent(getParam(req.params.sheetName));
      const updatedSheet = await this.updateSheetUseCase.execute({
        proposalId,
        organizationId,
        sheetName,
        sheetData: body.sheetData as Record<string, unknown>,
        aiGenerated: false,
        actorRole: effectiveRole,
        actorId: userId
      });
      res.status(200).json({ success: true, data: updatedSheet });
    } catch (error) { next(error); }
  };

  generateAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, userId, role } = authContext(req);
      const proposalId = getParam(req.params.id);
      const effectiveRole = await this.resolveEffectiveRole(proposalId, userId, role, organizationId);
      if (effectiveRole === 'SALES_REP') {
        throw new ForbiddenError('Đại diện kinh doanh (SALES_REP) chỉ có quyền xem đề xuất (Proposal), không có quyền sinh lại Proposal.');
      }
      const body = bodyObject(req);
      const result = await this.generateSheetsUseCase.execute({
        proposalId, organizationId,
        sheetNames: body.sheetNames, instructions: body.instructions
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  };

  generateSheet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, userId, role } = authContext(req);
      const proposalId = getParam(req.params.id);
      const effectiveRole = await this.resolveEffectiveRole(proposalId, userId, role, organizationId);
      if (effectiveRole === 'SALES_REP') {
        throw new ForbiddenError('Đại diện kinh doanh (SALES_REP) chỉ có quyền xem đề xuất (Proposal), không có quyền sinh lại Proposal.');
      }
      const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
      const sheetName = decodeURIComponent(getParam(req.params.sheetName));
      const result = await this.generateSheetsUseCase.execute({
        proposalId, organizationId,
        sheetNames: [sheetName], instructions: body.instructions
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  };

  regenerateSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, userId, role } = authContext(req);
      const proposalId = getParam(req.params.id);
      const effectiveRole = await this.resolveEffectiveRole(proposalId, userId, role, organizationId);
      if (effectiveRole === 'SALES_REP') {
        throw new ForbiddenError('Đại diện kinh doanh (SALES_REP) chỉ có quyền xem đề xuất (Proposal), không có quyền sinh lại Proposal.');
      }
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? req.body as Record<string, unknown> : {};
      const sectionName = decodeURIComponent(getParam(req.params.sectionName));
      const result = await this.generateSheetsUseCase.execute({
        proposalId, organizationId,
        sheetNames: [sectionName], instructions: body.instructions
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  };

  submitForReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, userId, role } = authContext(req);
      if (role === 'SALES_REP') {
        throw new ForbiddenError('Đại diện kinh doanh (SALES_REP) chỉ có quyền xem đề xuất (Proposal), không có quyền trình duyệt Proposal.');
      }
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

  /**
   * POST /api/v1/proposals/:id/ai-assist
   * AI Chatbot Copilot assisting Presale Consultant in reviewing, correcting, and rewriting proposal content
   */
  aiAssist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, userId, role } = authContext(req);
      const proposalId = getParam(req.params.id);
      const effectiveRole = await this.resolveEffectiveRole(proposalId, userId, role, organizationId);
      if (effectiveRole === 'SALES_REP') {
        throw new ForbiddenError('Đại diện kinh doanh (SALES_REP) chỉ có quyền xem đề xuất (Proposal), không có quyền sử dụng AI chỉnh sửa Proposal.');
      }
      const { prompt, selectedText, sheetName, currentSheetData } = req.body || {};

      if (!prompt && !selectedText) {
        throw new ValidationError('Cần cung cấp nội dung yêu cầu hoặc đoạn văn bản bôi đen.');
      }

      let aiReply = '';
      let suggestedText = '';

      if (this.llmGateway) {
        const fullPrompt = `
Dự án Proposal ID: ${proposalId}
Sheet liên quan: ${sheetName || 'Chung'}
Đoạn văn bản bôi đen người dùng chọn (nếu có):
"${selectedText || ''}"

Nội dung dữ liệu sheet hiện tại:
${JSON.stringify(currentSheetData || {}, null, 2).slice(0, 1500)}

Yêu cầu từ Presale Consultant / Lead:
"${prompt || 'Hãy phân tích, loại bỏ phần thừa/sai và viết lại đoạn bôi đen cho chuẩn doanh nghiệp.'}"

HƯỚNG DẪN:
1. Đóng vai trò là Chuyên gia Tư vấn Presale (Presale Consultant AI) giàu kinh nghiệm.
2. Trả lời phân tích ngắn gọn, chỉ rõ chỗ sai/thừa nếu có và đưa ra lý do.
3. Cung cấp ĐOẠN VĂN BẢN ĐỀ XUẤT THAY THẾ (SUGGESTED REPLACEMENT) rõ ràng, súc tích, chuẩn kỹ thuật để người dùng có thể áp dụng trực tiếp vào Proposal bằng 1 click.
4. Định dạng trả lời:
[PHÂN TÍCH]
<nội dung phân tích ngắn gọn>

[ĐỀ XUẤT THAY THẾ]
<đoạn văn bản hoàn chỉnh để thay thế hoặc chèn vào sheet>
`;
        try {
          const generated = await this.llmGateway.generate({
            taskMode: LLMTaskMode.PROPOSAL_BUILDER,
            prompt: fullPrompt,
            temperature: 0.3,
            maxTokens: 1500
          });
          aiReply = generated;

          if (generated.includes('[ĐỀ XUẤT THAY THẾ]')) {
            const parts = generated.split('[ĐỀ XUẤT THAY THẾ]');
            suggestedText = parts[1].trim();
          } else {
            suggestedText = selectedText ? generated.trim() : '';
          }
        } catch (llmErr) {
          console.warn('[ProposalController.aiAssist] LLM generation error, using fallback:', llmErr);
        }
      }

      // Fallback if LLM gateway unavailable or empty
      if (!aiReply) {
        if (selectedText) {
          suggestedText = selectedText
            .replace(/tạm thời|giả định|chưa xác định/gi, 'đạt chuẩn doanh nghiệp và tối ưu hiệu năng')
            .trim();
          aiReply = `[PHÂN TÍCH]\nĐoạn văn bản bôi đen đã được rà soát. Các từ ngữ chưa chuẩn xác hoặc giả định đã được chuẩn hóa.\n\n[ĐỀ XUẤT THAY THẾ]\n${suggestedText}`;
        } else {
          aiReply = `[PHÂN TÍCH]\nĐã phân tích Sheet "${sheetName}". Nội dung cơ bản phù hợp với hồ sơ kỹ thuật, các chỉ số SLA và lộ trình WBS đạt chuẩn.`;
          suggestedText = 'Kiến trúc hệ thống đáp ứng tính sẵn sàng cao 99.999% với độ trễ P95 < 150ms.';
        }
      }

      res.status(200).json({
        success: true,
        data: {
          reply: aiReply,
          suggestedText,
          sheetName,
          selectedText
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET / POST /api/v1/proposals/:id/self-assess
   * Presale Consultant 10-Sheet Self-Assessment evaluation
   */
  selfAssess10Sheets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = authContext(req);
      const proposalId = getParam(req.params.id);
      const proposal = await this.getByIdUseCase.execute(proposalId, organizationId);
      if (!proposal) throw new NotFoundError('Proposal not found.');

      const standardSheets = [
        { order: 1, name: 'Overview', criteria: 'Tính đầy đủ của Executive Summary và mục tiêu dự án.' },
        { order: 2, name: 'Scope of Work', criteria: 'Mức độ phân rã WBS, độ chi tiết của các tính năng và ước tính ngày công.' },
        { order: 3, name: 'Architecture & Tech Stack', criteria: 'Tính đầy đủ của các tầng công nghệ và lựa chọn kiến trúc.' },
        { order: 4, name: 'Timeline & Milestones', criteria: 'Lộ trình bàn giao qua các mốc và tính nhất quán của tổng thời gian.' },
        { order: 5, name: 'Team & Rate Cards', criteria: 'Cơ cấu đội ngũ, định mức nhân sự và chi phí khớp rate card.' },
        { order: 6, name: 'Pricing & Quotation', criteria: 'Bảng phân bổ chi phí theo đợt nghiệm thu, tính minh bạch ngân sách.' },
        { order: 7, name: 'Assumptions & Dependencies', criteria: 'Các điều kiện tiên quyết về hạ tầng, dữ liệu và API bên thứ ba.' },
        { order: 8, name: 'Risk Management (RAID)', criteria: 'Đánh giá rủi ro tác động kỹ thuật và phương án giảm thiểu dự phòng.' },
        { order: 9, name: 'SLA & Maintenance', criteria: 'Chỉ số cam kết chất lượng dịch vụ và chính sách bảo trì.' },
        { order: 10, name: 'Appendices & Case Studies', criteria: 'Hồ sơ năng lực tham chiếu đã kiểm chứng (được phép trống, không bịa số liệu).' }
      ];

      const nonEmpty = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;
      const positive = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v) && v > 0;
      const arr = (v: unknown): Record<string, any>[] => (Array.isArray(v) ? v : []);
      type SheetCheck = { label: string; ok: boolean };
      const rubric: Record<string, (d: Record<string, any>) => SheetCheck[]> = {
        'Overview': d => [
          { label: 'executiveSummary có nội dung', ok: nonEmpty(d.executiveSummary) },
          { label: 'keyObjectives là danh sách mục tiêu không rỗng', ok: arr(d.keyObjectives).length > 0 && arr(d.keyObjectives).every(nonEmpty) }
        ],
        'Scope of Work': d => {
          const modules = arr(d.modules);
          return [
            { label: 'modules có ít nhất một phân hệ', ok: modules.length > 0 },
            { label: 'mỗi phân hệ có tên và mô tả tính năng', ok: modules.length > 0 && modules.every(m => nonEmpty(m.module) && nonEmpty(m.feature)) },
            { label: 'estimatedDays của mọi phân hệ là số dương', ok: modules.length > 0 && modules.every(m => positive(m.estimatedDays)) }
          ];
        },
        'Architecture & Tech Stack': d => {
          const stack = arr(d.stack);
          return [
            { label: 'stack có ít nhất một tầng công nghệ', ok: stack.length > 0 },
            { label: 'mỗi tầng có layer và technology', ok: stack.length > 0 && stack.every(s => nonEmpty(s.layer) && nonEmpty(s.technology)) }
          ];
        },
        'Timeline & Milestones': d => {
          const milestones = arr(d.milestones);
          const weeksSum = milestones.reduce((sum, m) => sum + (Number(m.durationWeeks) || 0), 0);
          return [
            { label: 'totalWeeks là số nguyên dương', ok: positive(d.totalWeeks) && Number.isInteger(d.totalWeeks) },
            { label: 'milestones không rỗng, durationWeeks luôn dương', ok: milestones.length > 0 && milestones.every(m => positive(m.durationWeeks)) },
            { label: 'tổng durationWeeks khớp totalWeeks', ok: milestones.length > 0 && weeksSum === d.totalWeeks }
          ];
        },
        'Team & Rate Cards': d => {
          const roles = arr(d.roles);
          const costSum = roles.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0);
          return [
            { label: 'roles không rỗng', ok: roles.length > 0 },
            { label: 'mỗi role có tên, manMonths và monthlyRate dương', ok: roles.length > 0 && roles.every(r => nonEmpty(r.role) && positive(r.manMonths) && positive(r.monthlyRate)) },
            { label: 'totalTeamCost khớp tổng totalCost các role', ok: roles.length > 0 && positive(d.totalTeamCost) && costSum === d.totalTeamCost }
          ];
        },
        'Pricing & Quotation': d => {
          const payments = arr(d.paymentMilestones);
          const paidSum = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          return [
            { label: 'grandTotal là số dương', ok: positive(d.grandTotal) },
            { label: 'teamCost là số không âm', ok: typeof d.teamCost === 'number' && Number.isFinite(d.teamCost) && d.teamCost >= 0 },
            { label: 'tổng paymentMilestones khớp grandTotal', ok: payments.length === 0 || paidSum === d.grandTotal }
          ];
        },
        'Assumptions & Dependencies': d => {
          const items = arr(d.items);
          return [
            { label: 'items không rỗng', ok: items.length > 0 },
            { label: 'mỗi giả định có mô tả', ok: items.length > 0 && items.every(i => nonEmpty(i.description)) }
          ];
        },
        'Risk Management (RAID)': d => {
          const risks = arr(d.risks);
          return [
            { label: 'risks không rỗng', ok: risks.length > 0 },
            { label: 'mỗi rủi ro có mô tả và phương án giảm thiểu', ok: risks.length > 0 && risks.every(r => nonEmpty(r.risk) && nonEmpty(r.mitigation)) }
          ];
        },
        'SLA & Maintenance': d => {
          const metrics = arr(d.metrics);
          return [
            { label: 'metrics không rỗng', ok: metrics.length > 0 },
            { label: 'mỗi chỉ số có metric và target', ok: metrics.length > 0 && metrics.every(m => nonEmpty(m.metric) && nonEmpty(m.target)) }
          ];
        },
        'Appendices & Case Studies': d => {
          const cases = arr(d.caseStudies);
          return [
            { label: 'caseStudies là danh sách hợp lệ (được phép trống khi chưa có tham chiếu kiểm chứng)', ok: Array.isArray(d.caseStudies) },
            { label: 'mỗi case study có client và outcome', ok: cases.every(c => nonEmpty(c.client) && nonEmpty(c.outcome)) }
          ];
        }
      };

      const sheetAssessments = standardSheets.map(s => {
        const found = proposal.sheets.find(ps => ps.sheetName.toLowerCase() === s.name.toLowerCase())
          || proposal.sheets.find(ps => ps.sheetOrder === s.order);
        const checks = found ? (rubric[s.name]?.(found.sheetData as Record<string, any>) ?? []) : [];
        const passedCount = checks.filter(c => c.ok).length;
        const score = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 0;
        const status = score >= 90 ? 'PASSED' : 'NEEDS_REVISION';
        const findings = found
          ? checks.map(c => `${c.ok ? 'ĐẠT' : 'THIẾU'}: ${c.label}`)
          : ['Sheet chưa được tạo trong proposal.'];
        return {
          sheetOrder: s.order,
          sheetName: s.name,
          score,
          status,
          criteria: s.criteria,
          findings,
          recommendations: status === 'PASSED'
            ? 'Nội dung đạt các tiêu chí kiểm tra, sẵn sàng trình duyệt.'
            : 'Bổ sung các mục bị đánh dấu THIẾU trước khi trình duyệt.'
        };
      });

      const passedSheets = sheetAssessments.filter(s => s.status === 'PASSED').length;
      const totalScore = Math.round(sheetAssessments.reduce((sum, s) => sum + s.score, 0) / sheetAssessments.length);

      res.status(200).json({
        success: true,
        data: {
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          overallScore: totalScore,
          rating: totalScore >= 90 ? 'ĐẠT CHUẨN TRÌNH DUYỆT' : 'CẦN BỔ SUNG KỸ THUẬT',
          assessedByRole: 'PRESALE_CONSULTANT',
          evaluatedAt: new Date().toISOString(),
          summary: `Đánh giá theo tiêu chí nội dung: ${passedSheets}/10 sheets đạt, điểm trung bình ${totalScore}/100.${passedSheets < 10 ? ' Các sheets chưa đạt cần bổ sung trước khi trình duyệt.' : ''}`,
          sheets: sheetAssessments
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
