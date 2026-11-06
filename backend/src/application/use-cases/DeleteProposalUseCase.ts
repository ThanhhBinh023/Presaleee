import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { NotFoundError } from '../../domain/errors/AppError.js';
import { requiredUuid } from '../services/RequestValidation.js';

export class DeleteProposalUseCase {
  constructor(private readonly proposalRepo: IProposalRepository) {}

  async execute(id: string, organizationId: string): Promise<boolean> {
    const proposalId = requiredUuid(id, 'id');
    const existing = await this.proposalRepo.findById(proposalId, organizationId);
    if (!existing) throw new NotFoundError('Proposal not found.');

    return await this.proposalRepo.delete(proposalId, organizationId);
  }
}
