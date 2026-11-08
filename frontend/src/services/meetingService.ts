import { apiRequest } from './apiClient';
import type { MeetingAttendee } from '../types/lead';
import type { MeetingRecord, MeetingStatus as TMeetingStatus } from '../types/meeting';

const PREFIX = '/api/v1/meetings';
const AI_TIMEOUT_MS = 90_000;

export interface ActionItem {
  task: string;
  assignee: string;
  deadline?: string;
  completed?: boolean;
}

export interface GapAnalysis {
  missing_parameters?: string[];
  proactive_questions?: string[];
  presale_recommendations?: string[];
}

export type MeetingStatus = 'OPEN' | 'LOCKED' | 'INSPECTED' | 'REOPENED';
export type MeetingSourceTool = 'ZOOM' | 'GOOGLE_MEET' | 'TEAMS' | 'FIREFLIES' | 'OTTER' | 'MANUAL';

export interface Meeting {
  id: string;
  leadId: string;
  title: string;
  meetingDate: string;
  meetingOrder: number;
  sourceTool: MeetingSourceTool;
  status: MeetingStatus;
  rawTranscript: string;
  cleanNotes: string;
  keyDiscussionPoints: string[];
  clarifiedRequirements: string[];
  actionItems: ActionItem[];
  suggestedFollowupQuestions: string[];
  discussionTopics: string[];
  gapAnalysis: GapAnalysis | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMeetingPayload {
  leadId: string;
  title: string;
  sourceTool?: MeetingSourceTool;
  rawTranscript?: string;
  meetingDate?: string;
}

export async function fetchMeetingsByLead(leadId: string): Promise<Meeting[]> {
  try {
    const list = await apiRequest<Meeting[]>(`${PREFIX}/lead/${encodeURIComponent(leadId)}`);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function createMeeting(payload: CreateMeetingPayload): Promise<Meeting> {
  return await apiRequest<Meeting>(PREFIX, {
    method: 'POST',
    body: payload
  });
}

export async function inspectMeeting(meetingId: string, rawTranscript?: string): Promise<Meeting> {
  return await apiRequest<Meeting>(`${PREFIX}/${encodeURIComponent(meetingId)}/inspect`, {
    method: 'POST',
    body: { rawTranscript },
    timeoutMs: AI_TIMEOUT_MS
  });
}

export async function updateMeetingLifecycle(meetingId: string, status: MeetingStatus): Promise<Meeting> {
  return await apiRequest<Meeting>(`${PREFIX}/${encodeURIComponent(meetingId)}/lifecycle`, {
    method: 'PATCH',
    body: { status }
  });
}

export async function updateMeeting(meetingId: string, payload: Partial<Meeting>): Promise<Meeting> {
  return await apiRequest<Meeting>(`${PREFIX}/${encodeURIComponent(meetingId)}`, {
    method: 'PUT',
    body: payload
  });
}

export async function deleteMeeting(meetingId: string): Promise<void> {
  await apiRequest<void>(`${PREFIX}/${encodeURIComponent(meetingId)}`, {
    method: 'DELETE'
  });
}

export const meetingService = {
  getById: (id: string) => apiRequest<MeetingRecord>(`${PREFIX}/${encodeURIComponent(id)}`),

  saveTranscript: (id: string, transcript: string, append = false) =>
    apiRequest<MeetingRecord>(`${PREFIX}/${encodeURIComponent(id)}/transcript`, {
      method: 'POST',
      body: { transcript, append }
    }),

  analyze: (id: string) =>
    apiRequest<MeetingRecord>(`${PREFIX}/${encodeURIComponent(id)}/analyze`, {
      method: 'POST',
      timeoutMs: AI_TIMEOUT_MS
    }),

  updateStatus: (id: string, status: TMeetingStatus) =>
    apiRequest<MeetingRecord>(`${PREFIX}/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status }
    })
};

export type { MeetingAttendee };
