import { IProposalRepository, UpdateProposalParams } from '../../domain/repositories/IProposalRepository.js';
import { Proposal } from '../../domain/entities/Proposal.js';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../../domain/errors/AppError.js';

export interface UpdateProposalDTO {
  id: string;
  organizationId: string;
  actorId: string;
  actorRole: string;
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
    if (!dto.organizationId || !dto.actorId) throw new ValidationError('Authenticated user and organization are required.');
    const validStatuses: Proposal['status'][] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SENT_TO_CLIENT', 'ACCEPTED', 'REJECTED'];
    if (dto.status !== undefined && !validStatuses.includes(dto.status)) throw new ValidationError('Invalid proposal status.');

    const existing = await this.proposalRepo.findById(dto.id, dto.organizationId);
    if (!existing) {
      throw new NotFoundError(`Proposal with ID '${dto.id}' was not found.`);
    }

    const updates: UpdateProposalParams = {};
    if (dto.title !== undefined) {
      if (!dto.title.trim() || dto.title.trim().length > 255) throw new ValidationError('Proposal title must be 1–255 characters.');
      updates.title = dto.title.trim();
    }
    if (dto.version !== undefined) {
      if (!dto.version.trim() || dto.version.length > 20) throw new ValidationError('version must contain 1–20 characters.');
      updates.version = dto.version.trim();
    }
    if (dto.totalCost !== undefined) {
      if (dto.totalCost !== null && (!Number.isFinite(dto.totalCost) || dto.totalCost < 0)) throw new ValidationError('totalCost must be non-negative.');
      updates.totalCost = dto.totalCost;
    }
    if (dto.currency !== undefined) {
      if (!/^[A-Z]{3}$/.test(dto.currency)) throw new ValidationError('currency must be a three-letter uppercase ISO code.');
      updates.currency = dto.currency;
    }
    if (dto.estimatedTimelineWeeks !== undefined) {
      if (dto.estimatedTimelineWeeks !== null && (!Number.isInteger(dto.estimatedTimelineWeeks) || dto.estimatedTimelineWeeks < 1)) {
        throw new ValidationError('estimatedTimelineWeeks must be a positive integer.');
      }
      updates.estimatedTimelineWeeks = dto.estimatedTimelineWeeks;
    }
    if (dto.exportExcelUrl !== undefined) updates.exportExcelUrl = dto.exportExcelUrl;

    if (Object.keys(updates).length === 0 && dto.status === undefined) throw new ValidationError('At least one proposal field is required.');
    if (dto.status !== undefined && Object.keys(updates).length > 0) {
      throw new ValidationError('Update proposal metadata and status in separate requests.');
    }
    if (Object.keys(updates).length > 0 && existing.status !== 'DRAFT') {
      throw new ConflictError('Only a DRAFT proposal can be edited.');
    }
    if (dto.status !== undefined) {
      const privilegedTransitions: Proposal['status'][] = ['APPROVED', 'REJECTED', 'SENT_TO_CLIENT', 'ACCEPTED'];
      if (privilegedTransitions.includes(dto.status) && !['ADMIN', 'PRESALE_LEAD'].includes(dto.actorRole)) {
        throw new AppError('Your role cannot approve, reject, or send this proposal.', 403);
      }
      const transitions: Record<Proposal['status'], Proposal['status'][]> = {
        DRAFT: ['IN_REVIEW', 'REJECTED'],
        IN_REVIEW: ['DRAFT', 'APPROVED', 'REJECTED'],
        APPROVED: ['IN_REVIEW', 'SENT_TO_CLIENT', 'REJECTED'],
        SENT_TO_CLIENT: ['ACCEPTED', 'REJECTED'],
        ACCEPTED: [],
        REJECTED: ['DRAFT']
      };
      if (dto.status !== existing.status && !transitions[existing.status].includes(dto.status)) {
        throw new ConflictError(`Proposal cannot transition from ${existing.status} to ${dto.status}.`);
      }
      if (dto.status !== existing.status) {
        const updatedStatus = await this.proposalRepo.updateStatus(
          dto.id, dto.organizationId, dto.actorId, dto.status, [existing.status]
        );
        if (!updatedStatus) throw new ConflictError('Proposal status changed concurrently. Reload and retry.');
      }
    }
    if (Object.keys(updates).length === 0) {
      const current = await this.proposalRepo.findById(dto.id, dto.organizationId);
      if (!current) throw new NotFoundError('Proposal not found.');
      return current;
    }
    const updated = await this.proposalRepo.update(dto.id, dto.organizationId, updates);
    if (!updated) throw new NotFoundError('Proposal not found.');
    return updated;
  }
}
