import { IMeetingRepository } from '../../domain/repositories/IMeetingRepository.js';
import { MeetingDTO } from '../dtos/MeetingDTOs.js';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError.js';

export class GetMeetingByIdUseCase {
  constructor(private readonly meetingRepository: IMeetingRepository) {}

  async execute(meetingId: string): Promise<MeetingDTO> {
    if (!meetingId || typeof meetingId !== 'string' || !meetingId.trim()) {
      throw new ValidationError('Meeting ID is required.');
    }

    const meeting = await this.meetingRepository.findById(meetingId.trim());
    if (!meeting) {
      throw new NotFoundError(`Meeting with ID '${meetingId}' not found.`);
    }

    return meeting;
  }
}
