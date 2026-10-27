import { Meeting, MeetingAttendee, MeetingStatus, MeetingAnalysis } from '../entities/Meeting.js';

export interface MeetingScope { organizationId: string; }

export interface CreateMeetingInput extends MeetingScope {
  leadId: string;
  createdBy: string;
  title: string;
  meetingDate: string;
  attendees: MeetingAttendee[];
}

export interface IMeetingRepository {
  create(input: CreateMeetingInput): Promise<Meeting | null>;
  listByLead(leadId: string, scope: MeetingScope): Promise<Meeting[]>;
  findById(meetingId: string, scope: MeetingScope): Promise<Meeting | null>;
  saveTranscript(meetingId: string, scope: MeetingScope, transcript: string, append: boolean): Promise<Meeting | null>;
  changeStatus(meetingId: string, scope: MeetingScope, status: MeetingStatus, allowedCurrent: MeetingStatus[]): Promise<Meeting | null>;
  saveAnalysis(meetingId: string, scope: MeetingScope, analysis: MeetingAnalysis): Promise<Meeting | null>;
}
