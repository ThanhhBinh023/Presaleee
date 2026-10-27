import { MeetingAttendee } from '../../domain/entities/Meeting.js';
import { ValidationError } from '../../domain/errors/AppError.js';

/** Fields exactly as they arrive on the wire; nothing is trusted until parseCreateMeetingInput accepts it. */
export interface CreateMeetingInputDTO {
  title?: unknown;
  meetingDate?: unknown;
  attendees?: unknown;
}

/** Validated write payload the use case is allowed to work with. */
export interface CreateMeetingDTO {
  leadId: string;
  organizationId: string;
  userId: string;
  title: string;
  meetingDate?: string;
  attendees: MeetingAttendee[];
}

function normalizeAttendees(value: unknown): MeetingAttendee[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100) throw new ValidationError('attendees must be a list of at most 100 people.');
  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ValidationError(`attendees[${index}] must be an object.`);
    const attendee = item as Record<string, unknown>;
    if (typeof attendee.name !== 'string' || !attendee.name.trim() || attendee.name.length > 200) {
      throw new ValidationError(`attendees[${index}].name is required and must be at most 200 characters.`);
    }
    const email = typeof attendee.email === 'string' ? attendee.email.trim() : undefined;
    if (attendee.email !== undefined && (email === undefined || email === '' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      throw new ValidationError(`attendees[${index}].email must be a valid email address.`);
    }
    if (attendee.role !== undefined && (typeof attendee.role !== 'string' || attendee.role.length > 100)) {
      throw new ValidationError(`attendees[${index}].role must be text up to 100 characters.`);
    }
    return {
      name: attendee.name.trim(),
      ...(email ? { email } : {}),
      ...(typeof attendee.role === 'string' ? { role: attendee.role.trim() } : {})
    };
  });
}

export function parseCreateMeetingInput(input: CreateMeetingInputDTO): Pick<CreateMeetingDTO, 'title' | 'meetingDate' | 'attendees'> {
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 255) {
    throw new ValidationError('Meeting title is required and must not exceed 255 characters.');
  }
  if (input.meetingDate !== undefined && (typeof input.meetingDate !== 'string' || Number.isNaN(new Date(input.meetingDate).getTime()))) {
    throw new ValidationError('meetingDate must be a valid date.');
  }
  return {
    title: input.title.trim(),
    ...(input.meetingDate === undefined ? {} : { meetingDate: new Date(input.meetingDate as string).toISOString() }),
    attendees: normalizeAttendees(input.attendees)
  };
}
