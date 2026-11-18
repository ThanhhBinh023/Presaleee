import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { ProposalSheet } from '../../domain/entities/Proposal.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError.js';
import { STANDARD_PROPOSAL_SHEETS } from '../../domain/entities/Proposal.js';
import { requiredUuid } from '../services/RequestValidation.js';

export interface UpdateProposalSheetDTO {
  proposalId: string;
  organizationId: string;
  sheetName: string;
  sheetData: Record<string, any>;
  aiGenerated?: boolean;
  actorRole?: string;
  actorId?: string;
}

export class UpdateProposalSheetUseCase {
  constructor(private readonly proposalRepo: IProposalRepository) {}

  async execute(dto: UpdateProposalSheetDTO): Promise<ProposalSheet> {
    if (!dto.sheetName || dto.sheetName.trim() === '') {
      throw new ValidationError('Sheet name is required.');
    }
    if (!dto.sheetData || typeof dto.sheetData !== 'object') {
      throw new ValidationError('Sheet data must be a valid JSON object.');
    }
    if (dto.sheetName === 'Pricing & Quotation' && dto.sheetData.grandTotal !== undefined &&
      (typeof dto.sheetData.grandTotal !== 'number' || !Number.isFinite(dto.sheetData.grandTotal) || dto.sheetData.grandTotal < 0)) {
      throw new ValidationError('Pricing grandTotal must be a non-negative finite number.');
    }
    if (dto.sheetName === 'Timeline & Milestones' && dto.sheetData.totalWeeks !== undefined &&
      (typeof dto.sheetData.totalWeeks !== 'number' || !Number.isInteger(dto.sheetData.totalWeeks) || dto.sheetData.totalWeeks < 1)) {
      throw new ValidationError('Timeline totalWeeks must be a positive integer.');
    }

    const proposalId = requiredUuid(dto.proposalId, 'proposalId');
    const proposal = await this.proposalRepo.findById(proposalId, dto.organizationId);
    if (!proposal) throw new NotFoundError('Proposal not found.');
    if (dto.actorRole === 'SALES_REP') {
      throw new ForbiddenError('Đại diện kinh doanh (SALES_REP) chỉ có quyền xem đề xuất (Proposal), không có quyền chỉnh sửa nội dung Proposal.');
    }
    if (!['DRAFT', 'REJECTED', 'IN_REVIEW'].includes(proposal.status)) {
      if (!['ADMIN', 'PRESALE_LEAD'].includes(dto.actorRole || '')) {
        throw new ForbiddenError('Dự án đã được phê duyệt hoàn thành. Ngoại trừ Trưởng dự án (Presale Lead), không có vai trò nào được phép điều chỉnh.');
      }
    }

    const sheetDefinition = STANDARD_PROPOSAL_SHEETS.find(sheet => sheet.name === dto.sheetName.trim());
    if (!sheetDefinition) throw new ValidationError('Unknown proposal sheet name.');
    const updatedSheet = await this.proposalRepo.updateSheet(
      proposalId,
      dto.organizationId,
      dto.sheetName.trim(),
      sheetDefinition.order,
      dto.sheetData,
      dto.aiGenerated ?? false
    );
    if (!updatedSheet) throw new NotFoundError('Proposal not found.');

    return updatedSheet;
  }
}
