export const MEETING_STATUSES = ['OPEN', 'LOCKED', 'INSPECTED'] as const;
export type MeetingStatus = typeof MEETING_STATUSES[number];

export interface MeetingAnalysis {
  summary: string;
  technicalSummary: string;
  decisions: string[];
  actionItems: Array<{ task: string; assignee: string | null; deadline: string | null }>;
  openQuestions: string[];
  gapAnalysis: { risks: string[]; missingInformation: string[]; followUpQuestions: string[] };
}

export interface MeetingAttendee {
  name: string;
  email?: string;
  role?: string;
}

export interface Meeting {
  id: string;
  leadId: string;
  organizationId: string;
  createdBy: string | null;
  title: string;
  meetingDate: string;
  attendees: MeetingAttendee[];
  status: MeetingStatus;
  rawTranscript: string | null;
  cleanNotes: string | null;
  decisions: string[];
  actionItems: MeetingAnalysis['actionItems'];
  openQuestions: string[];
  gapAnalysis: MeetingAnalysis['gapAnalysis'];
  analysis: MeetingAnalysis | Record<string, never>;
  analyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
