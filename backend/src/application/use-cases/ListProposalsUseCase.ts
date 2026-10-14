import { IProposalRepository, ProposalFilterParams } from '../../domain/repositories/IProposalRepository.js';
import { Proposal } from '../../domain/entities/Proposal.js';

export interface ListProposalsDTO {
  organizationId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ListProposalsUseCase {
  constructor(private readonly proposalRepo: IProposalRepository) {}

  async execute(dto: ListProposalsDTO = {}): Promise<{
    proposals: Proposal[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, dto.page || 1);
    const limit = Math.min(100, Math.max(1, dto.limit || 20));
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
