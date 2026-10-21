import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { Proposal } from '../../domain/entities/Proposal.js';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/errors/AppError.js';
import { requiredUuid } from '../services/RequestValidation.js';

export class SubmitProposalForReviewUseCase {
  constructor(private readonly proposalRepository: IProposalRepository) {}

  async execute(proposalId: string, organizationId: string, actorId: string): Promise<Proposal> {
    if (!organizationId || !actorId) throw new ValidationError('Proposal, organization, and authenticated user are required.');
    const targetId = requiredUuid(proposalId, 'proposalId');
    const existing = await this.proposalRepository.findById(targetId, organizationId);
    if (!existing) throw new NotFoundError('Proposal not found.');
    if (existing.status !== 'DRAFT') throw new ConflictError('Only a DRAFT proposal can be submitted for review.');
    const submitted = await this.proposalRepository.submitForReview(targetId, organizationId, actorId);
    if (!submitted) throw new ConflictError('Proposal status changed concurrently. Reload and retry.');
    return submitted;
  }
}
