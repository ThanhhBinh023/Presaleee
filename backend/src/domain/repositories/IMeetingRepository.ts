import { Meeting, MeetingStatus, MeetingSourceTool, ActionItem, GapAnalysis } from '../entities/Meeting.js';

export interface CreateMeetingParams {
  leadId: string;
  createdBy?: string | null;
  title: string;
  meetingOrder?: number;
  meetingDate?: Date;
  status?: MeetingStatus;
  sourceTool?: MeetingSourceTool;
  audioRecordUrl?: string | null;
  rawTranscript?: string | null;
}

export interface UpdateMeetingParams {
  title?: string;
  status?: MeetingStatus;
  meetingOrder?: number;
  meetingDate?: Date;
  sourceTool?: MeetingSourceTool;
  audioRecordUrl?: string | null;
  rawTranscript?: string | null;
  cleanNotes?: string | null;
  keyDiscussionPoints?: string[];
  clarifiedRequirements?: string[];
  actionItems?: ActionItem[];
  suggestedFollowupQuestions?: string[];
  discussionTopics?: string[];
  gapAnalysis?: GapAnalysis;
}

export interface IMeetingRepository {
  create(params: CreateMeetingParams): Promise<Meeting>;
  findById(id: string): Promise<Meeting | null>;
  listByLeadId(leadId: string): Promise<Meeting[]>;
  update(id: string, params: UpdateMeetingParams): Promise<Meeting>;
  delete(id: string): Promise<boolean>;
}
