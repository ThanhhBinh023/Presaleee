import { IProposalRepository, ProposalFilterParams } from '../../domain/repositories/IProposalRepository.js';
import { Proposal } from '../../domain/entities/Proposal.js';
import { ValidationError } from '../../domain/errors/AppError.js';
import { ProposalStatus } from '../../domain/entities/Proposal.js';

export interface ListProposalsDTO {
  organizationId: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ListProposalsUseCase {
  constructor(private readonly proposalRepo: IProposalRepository) {}

  async execute(dto: ListProposalsDTO): Promise<{
    proposals: Proposal[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (!dto.organizationId) throw new ValidationError('Authenticated organization is required.');
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ValidationError('page must be >= 1 and limit must be from 1 to 100.');
    }
    const statuses: ProposalStatus[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SENT_TO_CLIENT', 'ACCEPTED', 'REJECTED'];
    if (dto.status && !statuses.includes(dto.status as ProposalStatus)) throw new ValidationError('Invalid proposal status filter.');
    if (dto.search !== undefined && dto.search.length > 200) throw new ValidationError('search must not exceed 200 characters.');
    const offset = (page - 1) * limit;

    const filter: ProposalFilterParams = {
      organizationId: dto.organizationId,
      status: dto.status,
      search: dto.search,
      limit,
      offset
    };

    const { proposals, total } = await this.proposalRepo.findAll(filter);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      proposals,
      total,
      page,
      limit,
      totalPages
    };
  }
}
