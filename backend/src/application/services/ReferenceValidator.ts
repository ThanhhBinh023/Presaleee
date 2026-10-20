import { ValidationError } from '../../domain/errors/AppError.js';
import { IClientRepository } from '../../domain/repositories/IClientRepository.js';
import { IUserRepository } from '../../domain/repositories/IUserRepository.js';

/**
 * Guards UUID columns that carry foreign keys so clients get a 400 instead of a
 * database constraint failure.
 */
export class ReferenceValidator {
  constructor(
    private readonly clientRepository: IClientRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async validate(organizationId: string, references: { clientId?: string | null; assignedTo?: string | null }): Promise<void> {
    if (references.clientId) {
      const client = await this.clientRepository.findById(references.clientId, { organizationId });
      if (!client) throw new ValidationError('clientId does not match a client in this organization.');
    }
    for (const [field, userId] of [['assignedTo', references.assignedTo]] as const) {
      if (!userId) continue;
      const member = await this.userRepository.findById(userId);
      if (!member || member.organizationId !== organizationId) {
        throw new ValidationError(`${field} does not match a member of this organization.`);
      }
    }
  }
}
