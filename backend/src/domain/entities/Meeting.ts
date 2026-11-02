export type MeetingStatus = 'OPEN' | 'LOCKED' | 'INSPECTED' | 'REOPENED';

export type MeetingSourceTool =
  | 'ZOOM'
  | 'GOOGLE_MEET'
  | 'TEAMS'
  | 'FIREFLIES'
  | 'OTTER'
  | 'FATHOM'
  | 'MANUAL'
  | 'OTHER';

export interface ActionItem {
  id?: string;
  task: string;
  assignee: string;
  deadline?: string;
  completed?: boolean;
}

export interface GapAnalysis {
  missingParameters: string[];
  proactiveQuestions: string[];
  presaleRecommendations?: string[];
}

export interface Meeting {
  id: string;
  leadId: string;
  createdBy?: string | null;
  title: string;
  meetingOrder: number;
  meetingDate: Date;
  status: MeetingStatus;
  sourceTool: MeetingSourceTool;
  audioRecordUrl?: string | null;
  rawTranscript?: string | null;
  cleanNotes?: string | null;
  keyDiscussionPoints: string[];
  clarifiedRequirements: string[];
  actionItems: ActionItem[];
  suggestedFollowupQuestions: string[];
  discussionTopics: string[];
  gapAnalysis: GapAnalysis;
  createdAt?: Date;
  updatedAt?: Date;
}
