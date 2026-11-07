import { IMeetingRepository } from '../../domain/repositories/IMeetingRepository.js';
import { MeetingDTO } from '../dtos/MeetingDTOs.js';
import { ValidationError } from '../../domain/errors/AppError.js';

export class ListMeetingsByLeadUseCase {
  constructor(private readonly meetingRepository: IMeetingRepository) {}

  async execute(leadId: string): Promise<MeetingDTO[]> {
    if (!leadId || typeof leadId !== 'string' || !leadId.trim()) {
      throw new ValidationError('Lead ID is required to list meetings.');
    }

    return await this.meetingRepository.listByLeadId(leadId.trim());
  }
}
