import { IProposalRepository, UpdateProposalParams } from '../../domain/repositories/IProposalRepository.js';
import { Proposal } from '../../domain/entities/Proposal.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError.js';
import { requiredUuid } from '../services/RequestValidation.js';

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
  reviewNotes?: string | null;
}

export class UpdateProposalUseCase {
  constructor(private readonly proposalRepo: IProposalRepository) {}

  async execute(dto: UpdateProposalDTO): Promise<Proposal> {
    if (!dto.organizationId || !dto.actorId) throw new ValidationError('Authenticated user and organization are required.');
    const validStatuses: Proposal['status'][] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SENT_TO_CLIENT', 'ACCEPTED', 'REJECTED'];
    if (dto.status !== undefined && !validStatuses.includes(dto.status)) throw new ValidationError('Invalid proposal status.');

    const proposalId = requiredUuid(dto.id, 'id');
    const existing = await this.proposalRepo.findById(proposalId, dto.organizationId);
    if (!existing) throw new NotFoundError('Proposal not found.');

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
    if (Object.keys(updates).length > 0 && !['DRAFT', 'REJECTED', 'IN_REVIEW'].includes(existing.status)) {
      if (!['ADMIN', 'PRESALE_LEAD'].includes(dto.actorRole)) {
        throw new ForbiddenError('Dự án đã được phê duyệt hoàn thành. Ngoại trừ Trưởng dự án (Presale Lead), không có vai trò nào được phép điều chỉnh.');
      }
    }
    if (dto.status !== undefined) {
      const privilegedTransitions: Proposal['status'][] = ['APPROVED', 'REJECTED', 'SENT_TO_CLIENT', 'ACCEPTED'];
      if (privilegedTransitions.includes(dto.status)) {
        if (dto.actorRole === 'SALES_REP') {
          throw new ForbiddenError('Đại diện kinh doanh (SALES_REP) không có thẩm quyền phê duyệt hồ sơ đề xuất. Quyền này thuộc về Trưởng dự án (PRESALE_LEAD).');
        }
        if (!['ADMIN', 'PRESALE_LEAD'].includes(dto.actorRole)) {
          throw new ForbiddenError('Chỉ Trưởng dự án (PRESALE_LEAD) hoặc Quản trị viên mới có quyền phê duyệt hoặc từ chối hồ sơ đề xuất.');
        }
      }
      const transitions: Record<Proposal['status'], Proposal['status'][]> = {
        DRAFT: ['IN_REVIEW'],
        IN_REVIEW: ['DRAFT', 'APPROVED', 'REJECTED'],
        APPROVED: ['IN_REVIEW', 'SENT_TO_CLIENT', 'REJECTED', 'DRAFT'],
        SENT_TO_CLIENT: ['ACCEPTED', 'REJECTED', 'APPROVED'],
        ACCEPTED: [],
        REJECTED: ['DRAFT', 'IN_REVIEW']
      };
      if (dto.status !== existing.status && !transitions[existing.status].includes(dto.status)) {
        throw new ConflictError(`Proposal cannot transition from ${existing.status} to ${dto.status}. Hồ sơ cần được Submit for Review trước khi Presale Lead phê duyệt.`);
      }
      if (dto.status !== existing.status) {
        const updatedStatus = await this.proposalRepo.updateStatus(
          proposalId, dto.organizationId, dto.actorId, dto.status, [existing.status], dto.reviewNotes
        );
        if (!updatedStatus) throw new ConflictError('Proposal status changed concurrently. Reload and retry.');
      }
    }
    if (Object.keys(updates).length === 0) {
      const current = await this.proposalRepo.findById(proposalId, dto.organizationId);
      if (!current) throw new NotFoundError('Proposal not found.');
      return current;
    }
    const updated = await this.proposalRepo.update(proposalId, dto.organizationId, updates);
    if (!updated) throw new NotFoundError('Proposal not found.');
    return updated;
  }
}
