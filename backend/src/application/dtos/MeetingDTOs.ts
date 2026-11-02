import { MeetingStatus, MeetingSourceTool, ActionItem, GapAnalysis, Meeting } from '../../domain/entities/Meeting.js';

export interface CreateMeetingInputDTO {
  leadId: string;
  title: string;
  meetingDate?: string | Date;
  sourceTool?: MeetingSourceTool;
  audioRecordUrl?: string | null;
  rawTranscript?: string | null;
}

export interface InspectMeetingInputDTO {
  meetingId: string;
  rawTranscript?: string | null;
}

export interface UpdateMeetingLifecycleInputDTO {
  meetingId: string;
  status: MeetingStatus;
}

export interface MeetingDTO extends Meeting {}

export interface InspectMeetingOutputDTO {
  meeting: Meeting;
  inspectionSummary: {
    discussionPointsCount: number;
    clarifiedRequirementsCount: number;
    actionItemsCount: number;
    suggestedFollowupQuestionsCount: number;
    discussionTopicsCount: number;
  };
}
