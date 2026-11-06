import type { MeetingAttendee, MeetingStatus } from './lead';

export type { MeetingAttendee, MeetingStatus };

export const MEETING_STATUSES = ['OPEN', 'LOCKED', 'INSPECTED'] as const;

/** Manual PATCH /meetings/:id/status. INSPECTED is set only by successful analysis. */
export const MEETING_TRANSITIONS: Record<MeetingStatus, readonly MeetingStatus[]> = {
  OPEN: ['LOCKED'],
  LOCKED: ['OPEN'],
  INSPECTED: ['OPEN']
};

export interface MeetingActionItem {
  task: string;
  assignee: string | null;
  deadline: string | null;
}

export interface MeetingGapAnalysis {
  risks: string[];
  missingInformation: string[];
  followUpQuestions: string[];
}

export interface MeetingAnalysis {
  summary: string;
  technicalSummary: string;
  decisions: string[];
  actionItems: MeetingActionItem[];
  openQuestions: string[];
  gapAnalysis: MeetingGapAnalysis;
}

export interface MeetingRecord {
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
  actionItems: MeetingActionItem[];
  openQuestions: string[];
  gapAnalysis: MeetingGapAnalysis;
  analysis: MeetingAnalysis | Record<string, never>;
  analyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function isMeetingAnalysis(value: unknown): value is MeetingAnalysis {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return typeof (value as MeetingAnalysis).summary === 'string';
}
