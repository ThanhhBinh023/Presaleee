import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { ProposalWithSheets } from '../../domain/entities/Proposal.js';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError.js';

export class GetProposalByIdUseCase {
  constructor(private readonly proposalRepo: IProposalRepository) {}

  async execute(id: string): Promise<ProposalWithSheets> {
    if (!id || id.trim() === '') {
      throw new ValidationError('Proposal ID is required.');
    }

    const proposal = await this.proposalRepo.findById(id);
    if (!proposal) {
      throw new NotFoundError(`Proposal with ID '${id}' was not found.`);
    }

    return proposal;
  }
}
