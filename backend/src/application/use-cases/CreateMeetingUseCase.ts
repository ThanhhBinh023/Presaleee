import { IMeetingRepository } from '../../domain/repositories/IMeetingRepository.js';
import { CreateMeetingInputDTO, MeetingDTO } from '../dtos/MeetingDTOs.js';
import { ValidationError } from '../../domain/errors/AppError.js';

export class CreateMeetingUseCase {
  constructor(private readonly meetingRepository: IMeetingRepository) {}

  async execute(input: CreateMeetingInputDTO): Promise<MeetingDTO> {
    if (!input.leadId || typeof input.leadId !== 'string' || !input.leadId.trim()) {
      throw new ValidationError('Lead ID is required to create a meeting.');
    }

    if (!input.title || typeof input.title !== 'string' || !input.title.trim()) {
      throw new ValidationError('Meeting title is required.');
    }

    // 1. Fetch prior meetings for this Lead to determine order and carry-over context
    const priorMeetings = await this.meetingRepository.listByLeadId(input.leadId.trim());
    const meetingOrder = priorMeetings.length + 1;

    // 2. Carry forward suggested follow-up questions from the latest meeting as initial discussion topics
    let initialTopics: string[] = [];
    if (priorMeetings.length > 0) {
      const latestMeeting = priorMeetings[priorMeetings.length - 1];
      if (latestMeeting.suggestedFollowupQuestions && latestMeeting.suggestedFollowupQuestions.length > 0) {
        initialTopics = [...latestMeeting.suggestedFollowupQuestions];
      }
    }

    // 3. Create the meeting
    const meeting = await this.meetingRepository.create({
      leadId: input.leadId.trim(),
      title: input.title.trim(),
      meetingOrder,
      meetingDate: input.meetingDate ? new Date(input.meetingDate) : new Date(),
      status: 'OPEN',
      sourceTool: input.sourceTool || 'MANUAL',
      audioRecordUrl: input.audioRecordUrl || null,
      rawTranscript: input.rawTranscript?.trim() || null
    });

    // If there were carried-over topics, update them
    if (initialTopics.length > 0) {
      return await this.meetingRepository.update(meeting.id, {
        discussionTopics: initialTopics
      });
    }

    return meeting;
  }
}
