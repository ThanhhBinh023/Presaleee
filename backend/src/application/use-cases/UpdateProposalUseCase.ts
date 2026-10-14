import { IProposalRepository, UpdateProposalParams } from '../../domain/repositories/IProposalRepository.js';
import { Proposal } from '../../domain/entities/Proposal.js';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError.js';

export interface UpdateProposalDTO {
  id: string;
  title?: string;
  version?: string;
  status?: Proposal['status'];
  totalCost?: number | null;
  currency?: string;
  estimatedTimelineWeeks?: number | null;
  exportExcelUrl?: string | null;
}

export class UpdateProposalUseCase {
  constructor(private readonly proposalRepo: IProposalRepository) {}

  async execute(dto: UpdateProposalDTO): Promise<Proposal> {
    if (!dto.id || dto.id.trim() === '') {
      throw new ValidationError('Proposal ID is required.');
    }

    const existing = await this.proposalRepo.findById(dto.id);
    if (!existing) {
      throw new NotFoundError(`Proposal with ID '${dto.id}' was not found.`);
    }

    const updates: UpdateProposalParams = {};
    if (dto.title !== undefined) updates.title = dto.title.trim();
    if (dto.version !== undefined) updates.version = dto.version;
    if (dto.status !== undefined) updates.status = dto.status;
    if (dto.totalCost !== undefined) updates.totalCost = dto.totalCost;
    if (dto.currency !== undefined) updates.currency = dto.currency;
    if (dto.estimatedTimelineWeeks !== undefined) updates.estimatedTimelineWeeks = dto.estimatedTimelineWeeks;
    if (dto.exportExcelUrl !== undefined) updates.exportExcelUrl = dto.exportExcelUrl;

    return await this.proposalRepo.update(dto.id, updates);
  }
}
