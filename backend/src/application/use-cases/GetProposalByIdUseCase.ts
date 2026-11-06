import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { ProposalWithSheets } from '../../domain/entities/Proposal.js';
import { NotFoundError } from '../../domain/errors/AppError.js';
import { requiredUuid } from '../services/RequestValidation.js';

export class GetProposalByIdUseCase {
  constructor(private readonly proposalRepo: IProposalRepository) {}

  async execute(id: string, organizationId: string): Promise<ProposalWithSheets> {
    const proposal = await this.proposalRepo.findById(requiredUuid(id, 'id'), organizationId);
    if (!proposal) throw new NotFoundError('Proposal not found.');

    return proposal;
  }
}
