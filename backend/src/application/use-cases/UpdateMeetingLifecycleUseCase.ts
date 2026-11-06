import { IMeetingRepository } from '../../domain/repositories/IMeetingRepository.js';
import { UpdateMeetingLifecycleInputDTO, MeetingDTO } from '../dtos/MeetingDTOs.js';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError.js';
import { MeetingStatus } from '../../domain/entities/Meeting.js';

const ALLOWED_STATUSES: MeetingStatus[] = ['OPEN', 'LOCKED', 'INSPECTED', 'REOPENED'];

export class UpdateMeetingLifecycleUseCase {
  constructor(private readonly meetingRepository: IMeetingRepository) {}

  async execute(input: UpdateMeetingLifecycleInputDTO): Promise<MeetingDTO> {
    if (!input.meetingId || typeof input.meetingId !== 'string' || !input.meetingId.trim()) {
      throw new ValidationError('Meeting ID is required.');
    }

    if (!input.status || !ALLOWED_STATUSES.includes(input.status)) {
      throw new ValidationError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}.`);
    }

    const meeting = await this.meetingRepository.findById(input.meetingId.trim());
    if (!meeting) {
      throw new NotFoundError(`Meeting with ID '${input.meetingId}' not found.`);
    }

    return await this.meetingRepository.update(meeting.id, {
      status: input.status
    });
  }
}
