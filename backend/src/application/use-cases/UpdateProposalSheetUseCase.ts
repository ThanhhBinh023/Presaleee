import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { ProposalSheet } from '../../domain/entities/Proposal.js';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError.js';

export interface UpdateProposalSheetDTO {
  proposalId: string;
  sheetName: string;
  sheetData: Record<string, any>;
  aiGenerated?: boolean;
}

export class UpdateProposalSheetUseCase {
  constructor(private readonly proposalRepo: IProposalRepository) {}

  async execute(dto: UpdateProposalSheetDTO): Promise<ProposalSheet> {
    if (!dto.proposalId || dto.proposalId.trim() === '') {
      throw new ValidationError('Proposal ID is required.');
    }
    if (!dto.sheetName || dto.sheetName.trim() === '') {
      throw new ValidationError('Sheet name is required.');
    }
    if (!dto.sheetData || typeof dto.sheetData !== 'object') {
      throw new ValidationError('Sheet data must be a valid JSON object.');
    }

    const proposal = await this.proposalRepo.findById(dto.proposalId);
    if (!proposal) {
      throw new NotFoundError(`Proposal with ID '${dto.proposalId}' was not found.`);
    }

    const updatedSheet = await this.proposalRepo.updateSheet(
      dto.proposalId,
      dto.sheetName.trim(),
      dto.sheetData,
      dto.aiGenerated ?? false
    );

    // If pricing sheet updated, automatically update parent proposal totalCost
    if (dto.sheetName === 'Pricing & Quotation' && typeof dto.sheetData?.grandTotal === 'number') {
      await this.proposalRepo.update(dto.proposalId, { totalCost: dto.sheetData.grandTotal });
    }

    // If timeline sheet updated, automatically update parent proposal timeline
    if (dto.sheetName === 'Timeline & Milestones' && typeof dto.sheetData?.totalWeeks === 'number') {
      await this.proposalRepo.update(dto.proposalId, { estimatedTimelineWeeks: dto.sheetData.totalWeeks });
    }

    return updatedSheet;
  }
}
