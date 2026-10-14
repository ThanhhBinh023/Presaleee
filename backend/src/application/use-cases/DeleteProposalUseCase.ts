import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError.js';

export class DeleteProposalUseCase {
  constructor(private readonly proposalRepo: IProposalRepository) {}

  async execute(id: string): Promise<boolean> {
    if (!id || id.trim() === '') {
      throw new ValidationError('Proposal ID is required.');
    }

    const existing = await this.proposalRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Proposal with ID '${id}' was not found.`);
    }

    return await this.proposalRepo.delete(id);
  }
}
